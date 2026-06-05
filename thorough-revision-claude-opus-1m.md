# Análise Completa — `ai2m2ia.github.io`

> Revisão independente e criteriosa do projeto inteiro (acessibilidade, segurança, escalabilidade, arquitetura e qualidade de testes). Nada foi modificado no código — este documento é apenas a análise.
> Autor da revisão: Claude Opus 4.8 (1M context). Data: 2026-06-05.

**Natureza do projeto:** site estático (GitHub Pages) para o catálogo literário do autor AI(2)M(2)IA, com três camadas: a *home* dinâmica (`index.html` + `app.js`), páginas estáticas por obra (`works/*/`) e um leitor PWA offline (`pwa/`). Há ainda uma "API estática" em JSON (`api/`) gerada por um builder Python (`tools/api/`) e uma esteira de CI robusta.

**Veredito geral:** este é um projeto **acima da média** em qualidade de engenharia para um site de portfólio. Já existe um `AUDIT-REPORT.md`, `SECURITY.md`, `AGENTS.md` e `CODE_REVIEW.md` com riscos aceitos documentados. A maioria das boas práticas de segurança e acessibilidade já está implementada. Os achados abaixo focam no que **ainda merece atenção** — cada item foi verificado diretamente no código, não apenas na documentação existente.

---

## 🔴 Achados de maior prioridade

### 1. GitHub Action não fixada por SHA (cadeia de suprimentos) — `prod-smoke.yml:46`
```yaml
uses: actions/github-script@v7      # ← tag mutável
```
Todas as outras 9 referências a actions no repositório estão corretamente fixadas por commit SHA (ex.: `actions/github-script@60a0d83… # v7.0.1` em `auto-tag-main.yml` e `auto-pr-promotion.yml`). Apenas esta usa a tag móvel `@v7`. Se essa tag for movida para um commit comprometido, o workflow agendado (roda a cada 6h, com `contents: read`) executa código diferente sem revisão. **É uma inconsistência clara com o próprio padrão do projeto** — fácil de corrigir, alinhando ao SHA já usado nos outros arquivos.

### 2. `claude-mention.yml` não restringe quem pode acionar o agente
O gatilho dispara em qualquer comentário contendo `@claude`:
```yaml
if: >
  (github.event_name == 'issue_comment' && ... contains(github.event.comment.body, '@claude')) || ...
```
Não há verificação de `author_association` (OWNER/MEMBER/COLLABORATOR). O comentário no topo diz "Lets a *maintainer* invoke", mas nada **força** isso. Como `issue_comment` roda com o workflow do branch base e o job recebe `pull-requests: write` + `issues: write` + o secret `CLAUDE_CODE_AUTH_TOKEN`, qualquer usuário externo pode (a) gastar os tokens do mantenedor e (b) tentar *prompt injection* contra um agente com permissão de escrita.

Mitigações já presentes reduzem o impacto: `persist-credentials: false`, `--max-turns 4`, modelo Sonnet e prompt defensivo. Ainda assim, **recomendo adicionar um gate de ator**, por exemplo:
```yaml
if: contains(...'@claude') && contains(fromJson('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association)
```
(Vale confirmar se a `claude-code-action` já aplica esse filtro internamente; se aplicar, o risco cai para baixo, mas o gate explícito no workflow é defesa em profundidade barata.)

### 3. Imagem Docker por tag mutável — `release-gate-review.yml:99`
```json
"args": ["run","-i","--rm","-e","GITHUB_PERSONAL_ACCESS_TOKEN","ghcr.io/github/github-mcp-server:v0.18.0"]
```
Mesma classe do item 1: `v0.18.0` é tag, não digest. Para consistência com a política de pinning do repositório, fixe por `@sha256:…`. Severidade menor (roda só em PRs), mas é o tipo de coisa que o próprio projeto se propõe a evitar.

---

## 🟡 Qualidade de testes

### 4. `tests/security.test.js` **copia** a implementação em vez de importá-la
O arquivo redefine `escapeHtml`, `safeUrl`, `safeMediaId`, `isSafeYouTubeId`, `renderProse`, `inlineMarkdown` localmente ("Extract pure functions from app.js for testing", linha 4). Os testes validam **a cópia**, não o código que roda em produção (`app.js` e `pwa/assets/app.js`). Consequência: a suíte pode permanecer verde enquanto a implementação real diverge ou regride. Hoje as cópias batem com o original, mas não há nada que garanta isso ao longo do tempo.

**Sugestão:** extrair essas funções puras para um módulo compartilhado (ex.: `lib/sanitize.js`) e importá-lo tanto no app quanto no teste. Isso elimina a divergência silenciosa e ainda reduz a duplicação de `escapeHtml` que hoje existe em 3 lugares (`app.js:541`, `pwa/assets/app.js:2046`, teste).

**Ponto positivo a registrar:** a ordem crítica de sanitização do leitor PWA está correta e bem documentada — `renderProse` (`pwa/assets/app.js:1729`) faz `escapeHtml()` **antes** do markdown inline, com um comentário explícito proibindo inverter a ordem. Esse é o principal vetor de XSS do projeto (renderização de conteúdo de capítulos) e está tratado corretamente.

---

## 🟡 Escalabilidade e arquitetura

### 5. Páginas de obra duplicadas à mão, sem gerador estático
As 7 páginas em `works/*/index.html` repetem ~90% da estrutura (header, nav, footer, CSP) verbatim. Não há SSG (Jekyll/11ty/Hugo). Sintomas já visíveis de *drift*:
- `aria-label` do botão de tema inconsistente: `"Switch to light theme"` (level-zero) vs `"Toggle theme"` (demais);
- bloco `<style>` inline de ~46 linhas em `works/the-princess-and-the-turtle/index.html` (estilos de WIP que deveriam estar no CSS global);
- esquemas de versionamento de cache misturados (`?v=20260601a` nos scripts da home/works vs `?v=14` no PWA).

Para 7 livros é gerenciável; a partir de ~10–12, uma alteração no header passa a exigir edição manual em N arquivos, com risco de inconsistência. **Recomendação:** migrar `works/` para um SSG com layout + *front-matter* por obra. Não é urgente, mas é a dívida estrutural mais relevante para o crescimento do catálogo.

### 6. i18n só existe na home
`app.js` traz um sistema de i18n bem feito (23 idiomas, RTL automático, cache em `localStorage` com revalidação por `lastUpdated`, fallback embutido para EN). Porém **as páginas `works/*` são 100% inglês fixo** — sem `data-i18n`. Para um projeto que se vende como multilíngue e global, as páginas de detalhe de cada obra ficam fora dessa promessa. É uma lacuna de alcance/acessibilidade linguística, não um bug.

---

## ✅ O que está sólido (e merece ser preservado)

**Segurança (front-end):**
- CSP estrita em todas as páginas: `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, sem `unsafe-inline`/`unsafe-eval`.
- Sanitização consistente: `escapeHtml` em toda interpolação, `safeUrl` rejeitando protocolos não-http(s) e cross-origin não autorizado, validadores estritos de ID (`isSafeYouTubeId` 11 chars, `isSafeTikTokId` 15–20 dígitos).
- Embeds de terceiros (YouTube/TikTok) carregados **sob demanda**, com `youtube-nocookie`, `sandbox` no iframe e `frame-src` restrito — bom para privacidade e desempenho.
- Service Worker (`pwa/sw.js`) **nunca cacheia respostas opacas** (valida `response.type === "basic"` e status 200), separa caches estático/API/assets, e tem *fallback* offline. Caching correto.
- CI: `permissions` mínimas por workflow (`release-gate-review.yml:155` chega a usar `permissions: {}`), **nenhum** `pull_request_target`, Dependabot (npm + actions) e `.gitleaks.toml` configurados.

**Acessibilidade:**
- Skip link funcional, `:focus-visible` com outline visível (`styles.css:169`), landmarks semânticos (`banner`/`main`/`contentinfo`), `aria-*` nos controles, navegação por teclado completa no dropdown de idiomas (setas/Home/End/Esc + *focus trap*) e na colagem do hero, `loading="eager/lazy"` e `width/height` explícitos nas imagens (evita CLS), `prefers-reduced-motion` tratado.

**Arquitetura:** zero dependências de runtime, separação clara hub-dinâmico/páginas-estáticas/PWA, API estática validada por JSON Schema (`additionalProperties: false`) com checagem de *path traversal* no validador e no builder Python (`realpath_inside()`), `Promise.allSettled` no carregamento de dados (degradação graciosa com *error boundaries* por seção).

**Riscos já aceitos e documentados** (não tratados como achados): ausência de `X-Content-Type-Options` e de `frame-ancestors`/`X-Frame-Options` são limitações do GitHub Pages, devidamente justificadas em `AGENTS.md §13` e `CODE_REVIEW.md`. A justificativa é razoável dado o modelo *read-only*, sem auth/forms/PII.

---

## Resumo priorizado

| # | Área | Achado | Severidade | Local |
|---|------|--------|-----------|-------|
| 1 | Supply-chain | Action não fixada por SHA | **Média-Alta** | `prod-smoke.yml:46` |
| 2 | CI / IA | `@claude` sem gate de ator | **Média** | `claude-mention.yml:29-31` |
| 3 | Supply-chain | Imagem Docker por tag mutável | Baixa-Média | `release-gate-review.yml:99` |
| 4 | Testes | Teste duplica a implementação | Média | `tests/security.test.js:4` |
| 5 | Escalabilidade | Páginas de obra duplicadas, sem SSG | Média | `works/*/index.html` |
| 6 | i18n/Alcance | Tradução só na home | Média | `works/*/index.html` |
| 7 | Consistência | `aria-label` do tema divergente; versões de cache mistas | Baixa | múltiplos |

**Recomendação de sequência:** corrigir #1 e #2 primeiro (rápidos, reduzem superfície de risco real na automação); depois #4 (extrair funções puras para módulo compartilhado, que também resolve duplicação); #5/#6 são investimento estrutural para quando o catálogo crescer.
