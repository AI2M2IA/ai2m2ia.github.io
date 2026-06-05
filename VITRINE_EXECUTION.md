# VITRINE_EXECUTION — plano de execução para o hub `ai2m2ia.github.io`

**Para:** Codex (este repo é território seu; este arquivo é handoff de execução — único arquivo novo, untracked, sem commit).
**De:** decisão do autor, delegada após análise cruzada independente. **Data:** 2026-06-05.
**Spec de origem:** `SPEC_VITRINE.md` (em `/Volumes/WORK/projects/lets-learn-aws-together/SPEC_VITRINE.md`, cópia em `projects-to-publish/book-lets-learn-aws-together/`) — o essencial está incorporado abaixo; em divergência, vale este documento (mais recente).

---

## 1. Contexto — hub vira VITRINE (hub-and-spoke)

O hub `https://ai2m2ia.github.io/` deixa de hospedar leitura/estudo e vira **vitrine enxuta** do universo AI(2)M(2)IA:

- **Hero** — identidade AI(2)M(2)IA (mint `#00f5d4` / purple `#9d4edd`, dark default) + 1 frase de posicionamento.
- **Catálogo em cards** — um card por obra: capa/ícone, título, 1–2 linhas, badges ("Study app", "Kindle", "Em breve"). **Cards linkam PRA FORA**:
  - *Let's Build on AWS Together* → site de estudo do livro (`https://ai2m2ia.github.io/book-lets-build-on-aws-together/` ou o path que o Pages do repo do livro publicar) + link Kindle;
  - demais obras → site próprio **quando existir**; senão Kindle ou "Em breve" honesto (sem stub vazio).
- **Autor & filosofia** — versão condensada (free forever, doações opcionais, licenças copyleft, pseudônimo).
- **Footer** — licenças, repo, contato.

**Regras invioláveis:**
- A **LEITURA acontece no PWA de cada obra** (GitHub Pages do repo da obra). O hub nunca duplica conteúdo de obra; só apresenta e aponta.
- A **API `/api/` do hub FICA INTACTA** — alimenta o app Android e leitores externos; os `manifestUrl` são **absolutos**; mover/renomear = quebrar contrato com clientes já distribuídos.
- O leitor PWA do hub **permanece por ora**; migração de leitura é decisão futura, obra a obra.
- Referência cruzada nos dois sentidos: card → obra; site da obra → hub ("Part of the AI(2)M(2)IA universe — see all works", já cumprido pelo PWA do livro AWS).

## 2. Decisão de cache (TOMADA — implementar junto com a vitrine, P4)

Versionamento por **hash de conteúdo gerado no build**, substituindo o trio inconsistente atual (`sw.js` cache `v15` / `?v=14` no PWA / `?v=20260601a` no site) **e** o `?v=${Date.now()}` dos data files:

- Build gera hash por asset/data-file → **manifesto de versões** ou query param `?v=<hash>` injetado nas referências.
- O **Service Worker é versionado a partir do mesmo hash** (nome de cache derivado do manifesto) — uma única fonte de verdade.
- **Remover `cache: 'no-cache'`** dos fetches de data files: a vitrine deve carregar **instantânea em visita repetida**.
- Critério: **mudou conteúdo → muda hash → invalida; não mudou → cache hit.** Nada de bump manual.

## 3. Shortlist priorizada

(Consolidada das 4 thorough-revisions + spot-checks no repo real. Esforço: S < 1h, M < 1 dia, L > 1 dia.)

### P1 — Segurança de CI (S)
- `claude-mention.yml`: **gate de `author_association`** (`OWNER`/`MEMBER`/`COLLABORATOR`) antes de acionar o agente — hoje qualquer externo pode gastar tokens/tentar prompt-injection.
- Pin por **SHA** do `actions/github-script@v7` em `prod-smoke.yml` (única action fora do padrão do repo).
- Docker por **digest** (não tag `v0.18.0`) no `release-gate-review.yml`.
- `prod-smoke.yml`: adicionar `issues: write` (o passo de criar issue em falha hoje não tem permissão e falharia silenciosamente).

### P2 — Fontes (S)
- **Deletar os 11 `.ttf`** (~3,2 MB de peso morto no deploy; `fonts.css` já serve WOFF2 primeiro).
- Conferir `font-display` e `preload` dos WOFF2 críticos.

### P3 — Higiene da API (S/M) — a API não muda de formato; isto é robustez do gerador
- `build_catalog.py`: **limpar órfãos** em `api/books/` (obra removida da fonte não pode continuar publicada).
- **Validação de integridade referencial** `works.json` ↔ API (route/mediaIds/workFamilyId existentes) no gate de CI.

### P4 — EXECUÇÃO DA VITRINE (M/L) — o grosso
- Home enxuta: hero + cards + autor condensado + footer (seção 1).
- **Deprecar `works/*`** com **redirects** (meta refresh ou stub com link para o destino da obra) — nunca página órfã. Registrar os achados pendentes das works (i18n, duplicação, SSG, drift de aria-label, `<style>` inline) como **resolved-by-removal** no histórico de QA.
- Leitor PWA do hub permanece por ora.
- **E2E ajustado** à nova estrutura (asserts das works → redirects; hero/cards/footer).
- **Implementar o cache da seção 2 aqui** (a home nova nasce com hash-versioning).

### P5 — Durante a reestruturação (M)
- Extrair **`lib/sanitize.js` única** (`escapeHtml`/`safeUrl`/`safeMediaId`) usada por site e PWA, e **apontar os testes para as funções REAIS** (hoje `tests/security.test.js` testa cópias — risco de drift).
- A11y do que fica: filtros do catálogo com **`aria-pressed`** (em vez de tablist incompleto); hero collage **com ação real ou sem `role="button"`/`tabindex`**; mobile menu com **Escape + focus-trap**.

## 4. NÃO-FAZER / falsos dos relatórios (não retrabalhar)

- **Ícones PNG do PWA EXISTEM** (`pwa/assets/icon-192.png`, `icon-512.png`, referenciados no manifest) — o achado do DeepSeek está errado.
- **"55 erros de contraste"** = eco do `AUDIT-REPORT.md` de 01/jun, **pré-correção**; o contraste hoje passa no axe do CI (`tests/accessibility.spec.js`). Não reabrir.
- **`.gitleaks.toml` já existe** — não criar.
- **NÃO investir** em i18n/melhorias/SSG das `works/*` (serão deprecadas — seria retrabalho) nem em melhorias do leitor PWA do hub (fica "por ora").
- **NÃO modularizar `app.js` antes da vitrine** — ele encolhe naturalmente na reestruturação; modularizar junto (P4/P5), não antes.

## 5. Critérios de aceite

1. **API `/api/` byte-idêntica** — smoke test de produção continua verde; nenhum `manifestUrl` alterado.
2. **Zero links quebrados** no hub (cards, redirects das works, footer) — verificação automatizada no CI/e2e.
3. **Gates verdes**: axe (a11y), CSP estrita sem regressão, cobertura ≥ 80%.
4. **Redirects das works funcionando** (cada antiga URL leva ao destino correto da obra).
5. **Performance**: Lighthouse/FCP da home **melhor que o atual** (fontes −3,2 MB + cache por hash devem garantir).
6. **Licenças/atribuição preservadas** (AGPL-3.0 + §7 / CC BY-NC-SA conforme cada parte; blocos de atribuição AI(2)M(2)IA intactos).

## 6. Mini-checklist de aceite (ordem recomendada, 1 por vez)

### Etapa 1 — Cards/links externos do catálogo (coração da vitrine)

1. [ ] **Card AWS** com destinos corretos:
   - [ ] `Let's Build on AWS Together` aponta para site de estudo.
   - [ ] `Let's Build on AWS Together` aponta para Kindle.
   - [ ] Ambos abrem em nova aba (`target="_blank"`) com `rel="noopener"`.
2. [ ] **Demais obras com destino honesto**:
   - [ ] obras com site têm destino de saída válido;
   - [ ] obras sem site mostram “Em breve”;
   - [ ] obras com Kindle mostram link Kindle.
3. [ ] **Zero links quebrados no catálogo**:
   - [ ] executar smoke/e2e por card (um teste para cada card).
4. [ ] **Acessibilidade da home nova**:
   - [ ] axe da homepage retorna verde.
   - [ ] nenhum alerta novo de links/foco de ação.

### Etapa 2 — Smoke da `/api/` (contrato Android, inegociável)

1. [ ] **Snapshot pré-mudança**:
   - [ ] obter hash do `catalog.json` atual.
   - [ ] obter hash de cada `api/books/*/content.json` atual.
2. [ ] **Snapshot pós-mudança**:
   - [ ] obter hash do `catalog.json` novo.
   - [ ] obter hash de cada `api/books/*/content.json` novo.
3. [ ] **Comparação byte a byte**:
   - [ ] `catalog.json` pré = pós.
   - [ ] `content.json` de cada livro pré = pós.
   - [ ] `manifestUrl` permanece idêntica para todos os itens.
4. [ ] **Smoke agendado**:
   - [ ] fluxo de smoke de produção segue verde.

### Etapa 3 — Deprecação das works + cache por hash

1. [ ] **Deprecação/redirects 1:1 das 7 works**:
   - [ ] `ashens-bloom`
   - [ ] `bell-that-remembers`
   - [ ] `crater-gospel`
   - [ ] `level-zero`
   - [ ] `the-princess-and-the-turtle`
   - [ ] `venomous-garden`
   - [ ] `lets-build-on-aws-together`
2. [ ] **Provas e2e por slug**:
   - [ ] cada slug de works responde com redirect para destino certo.
   - [ ] nenhum link interno órfão para rota removida.
3. [ ] **Cache por hash**:
   - [ ] build sem mudança de conteúdo mantém hash (cache hit).
   - [ ] build com mudança de conteúdo atualiza hash (cache miss).
   - [ ] Service Worker usa o mesmo hash/versionamento.
4. [ ] **Performance comparada**:
   - [ ] medir Lighthouse/FCP da home no baseline inicial.
   - [ ] reexecutar depois das mudanças.
   - [ ] confirmar FCP igual ou melhor que baseline.

---

*Consolidado a partir de: thorough-revision-{deepseek,codex,claude-sonnet,claude-opus-1m}.md + análise cruzada independente, 2026-06-05.*
