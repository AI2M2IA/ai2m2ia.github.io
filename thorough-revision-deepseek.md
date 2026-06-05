# Análise Completa do Projeto `ai2m2ia.github.io`

**Data da análise:** 2026-06-05 | **Ferramenta:** DeepSeek TUI

---

## 1. VISÃO GERAL DA ARQUITETURA

O projeto é um site estático para a marca autoral AI(2)M(2)IA, hospedado no GitHub Pages. Arquitetura em duas camadas:

- **Site principal** (`index.html` + `app.js` + `styles.css`): Catálogo de livros, personagens, mídia, filosofia de IA
- **PWA Reader** (`pwa/`): Leitor offline com Service Worker, cache e suporte a download

**Pontos fortes da arquitetura:**
- Zero dependências de produção (apenas `playwright`, `ajv`, `ajv-formats` como devDependencies)
- Separação clara entre site principal e PWA
- API estática sob `api/` com 30 livros e validação de schema em CI
- Suporte a 23 idiomas com fallback de cache em localStorage
- Design tokens via CSS custom properties com temas dark/light

---

## 2. SEGURANÇA — NOTA: 95/100 🟢

### 2.1 Content Security Policy (CSP)

O CSP é **exemplar** para um site estático:

```html
default-src 'self'; base-uri 'self'; object-src 'none';
script-src 'self'; style-src 'self'; font-src 'self';
img-src 'self' data: https://ai2m2ia.github.io;
connect-src 'self';
frame-src https://www.youtube-nocookie.com https://www.tiktok.com;
form-action 'self'
```

- ✅ Zero `unsafe-inline` / `unsafe-eval`
- ✅ `object-src 'none'` bloqueia plugins
- ✅ `frame-src` restrito a `youtube-nocookie.com` e `tiktok.com`
- ✅ `form-action 'self'` previne CSRF
- ✅ `base-uri 'self'` previne ataques de base tag injection
- ✅ Fontes self-hosted (sem Google Fonts)
- ✅ `referrer: strict-origin-when-cross-origin`

**PWA CSP** é ligeiramente diferente — adiciona `worker-src 'self'` e `manifest-src 'self'`, e expande `connect-src` para incluir `https://ai2m2ia.github.io` (necessário para o leitor buscar conteúdo da API).

### 2.2 Sanitização de Output (XSS Prevention)

A abordagem é robusta e em camadas:

| Função | Localização | Propósito | Estado |
|--------|-------------|-----------|--------|
| `escapeHtml()` | `app.js:541` | Escapa `& < > " '` | ✅ Implementado |
| `safeUrl()` | `app.js:550` | Valida URLs (same-origin/external) | ✅ Implementado |
| `safeMediaId()` | `app.js:562` | Valida IDs alfanuméricos | ✅ Implementado |
| `isSafeYouTubeId()` | `app.js:566` | Regex estrita para 11 chars | ✅ Implementado |
| `isSafeTikTokId()` | `app.js:570` | Regex para 15-20 dígitos | ✅ Implementado |
| `renderProse()` | `pwa/assets/app.js:1729` | "Escapa primeiro, formata depois" | ✅ Implementado |
| `resolveApiUrl()` | `pwa/assets/app.js:1754` | Validação de origem da API | ✅ Implementado |
| `resolveConfiguredApiBaseUrl()` | `pwa/assets/app.js:1770` | Restringe API a origens confiáveis | ✅ Implementado |

**Ponto crítico — `renderProse()`:** A ordem "sanitize first, then format" está corretamente documentada e implementada. O conteúdo é escapado via `escapeHtml()` antes de qualquer processamento markdown, prevenindo injeção via texto de capítulo.

**Uso de `innerHTML`:** O projeto usa `innerHTML` de forma controlada — todas as interpolações de dados JSON nos templates literais passam por `escapeHtml()` ou `safeUrl()`. Exemplos no `CatalogRenderer._card()` e `MediaRenderer._card()` confirmam o padrão.

### 2.3 Validação de Dados

- **Schemas JSON rigorosos** em `data/schemas/` validam `works.json`, `author.json`, `media.json`, `sources.json`
- **Validação em CI** via `scripts/validate-data.js` usando AJV 2020
- **Validação da API** via `tools/api/validate-api.js` com cross-validation entre `catalog.json` e `content.json`
- **Path traversal protection** no servidor de teste (`tests/server.js`) e no `localPathForApiUrl()` em `api-contract.js`

### 2.4 iFrames Seguros

O `MediaRenderer.loadEmbed()` (`app.js:758`) implementa sandbox adequado:
```javascript
iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
```
Os IDs de YouTube e TikTok são validados estritamente antes da criação do iframe.

### 2.5 Achados de Segurança

| Severidade | Achado | Recomendação |
|------------|--------|-------------|
| 🟡 Baixa | `gitleaks` detecta 4 falsos positivos no conteúdo educacional AWS | Adicionar `.gitleaks.toml` para ignorar |
| 🟢 Opcional | Sem Subresource Integrity (SRI) nos scripts | GitHub Pages não suporta headers customizados, SRI adicionaria pouco valor dado CSP `script-src 'self'` |
| 🟢 Opcional | Sem `Permissions-Policy` header | Baixo impacto para site estático sem APIs de dispositivo |

**Observação sobre `X-Content-Type-Options`:** Documentado como risco aceito em `AGENTS.md` §13 — GitHub Pages não suporta headers HTTP customizados, e o CSP `script-src 'self'` é uma proteção mais forte.

---

## 3. ACESSIBILIDADE — NOTA: 70/100 🟡

### 3.1 Estrutura Semântica — 🟢 Excelente

- ✅ Skip link funcional com `href="#main-content"`
- ✅ ARIA landmarks: `role="banner"`, `role="contentinfo"`, `aria-label="Primary navigation"`
- ✅ Hierarquia de headings correta
- ✅ `aria-label` em controles interativos
- ✅ `aria-expanded` em botões expansíveis (dropdown de idiomas, painel de auditoria)
- ✅ `aria-controls` no botão de auditoria
- ✅ `aria-hidden` no painel de auditoria colapsado
- ✅ Suporte RTL para `ar`, `fa`, `he`, `ur` via `dir="rtl"` dinâmico

### 3.2 Navegação por Teclado — 🟢 Excelente

- ✅ Dropdown de idiomas: suporte a Arrow Keys, Home, End, Escape, Enter, Space
- ✅ Focus trap funcional no dropdown
- ✅ Skip link funcional
- ✅ Ordem de tab lógica
- ✅ Colagem de personagens: suporte a mouse, focus, keyboard (Enter/Space)
- ✅ Embeds de mídia: click + keyboard (Enter/Space) para carregar

### 3.3 Problemas de Contraste — 🔴 Crítico (55 erros)

Conforme documentado no `AUDIT-REPORT.md`:

| Elemento | Contraste atual | Requerido | Ocorrências |
|----------|----------------|-----------|-------------|
| `.book-summary` | 4.43:1 | 4.5:1 | 7 |
| `.char-desc` | 4.43:1 | 4.5:1 | 4 |
| `.media-desc` | 4.43:1 | 4.5:1 | 21 |
| `.source-note` | 4.43:1 | 4.5:1 | 9 |
| `#analogy-calc`, `#analogy-type` | 4.43:1 | 4.5:1 | 2 |
| `#audit-panel p` | 4.43:1 | 4.5:1 | 1 |
| `.source-type` | 2.14:1 | 4.5:1 | 9 |
| `.footer-tagline` | 2.4:1 | 4.5:1 | 1 |

**Causa raiz:** `--text-muted` (#8a7e72 no modo dark) tem contraste insuficiente contra o fundo #1a1712. A diferença é de apenas 0.07:1 para atingir o mínimo WCAG AA.

### 3.4 Testes de Acessibilidade

O projeto tem uma suite abrangente de testes de acessibilidade (`tests/accessibility.spec.js`) usando `@axe-core/playwright`:
- Verificação de violações WCAG 2.1 AA no site principal, PWA, e páginas de obra
- Hierarquia de headings
- Atributos alt em imagens
- Labels em inputs
- Skip link funcional
- Contraste de cor (regra `color-contrast` do axe)
- Acessibilidade por teclado
- Indicadores de foco visíveis
- Validação de atributos ARIA

### 3.5 Recomendações de Acessibilidade

| Prioridade | Ação | Esforço | Impacto |
|------------|------|---------|---------|
| 🔴 Crítica | Ajustar `--text-muted` em dark mode (#8a7e72 → #9a8e82, ~+7%) | 5 min | 44 erros |
| 🔴 Crítica | Ajustar `.source-type` (2.14:1 → >4.5:1) | 10 min | 9 erros |
| 🔴 Crítica | Ajustar `.footer-tagline` (2.4:1 → >4.5:1) | 10 min | 1 erro |
| 🟡 Alta | Adicionar `aria-live` para conteúdo dinâmico | 30 min | Leitores de tela |
| 🟡 Alta | Testar com NVDA/VoiceOver | 2h | Validação real |

---

## 4. ESCALABILIDADE — NOTA: 85/100 🟢

### 4.1 Pontos Fortes

**Modelo de dados bem estruturado:**
- `works.json` com `workFamilies` (7 famílias de obras, expansível)
- Sistema de referência cruzada: `workIds` → `mediaIds`, `workFamilyId` → personagens
- Schema JSON rigoroso permite validação automatizada de novos dados

**Internacionalização escalável:**
- Fallback em inglês hardcoded no `app.js` — zero fetches para usuários EN
- 23 idiomas carregados sob demanda com cache em localStorage
- Sistema de `lastUpdated` para evitar re-fetches desnecessários
- Adicionar idioma = criar `data/i18n/<lang>.json` + adicionar entrada na lista

**API estática escalável:**
- 30 livros em `api/books/`, cada um com `content.json`
- `build_catalog.py` gera `catalog.json` automaticamente
- Validação cross-reference entre catálogo e conteúdo

**PWA offline-first:**
- Service Worker com estratégias `cache-first` (estáticos), `stale-while-revalidate` (API/assets)
- Download de livros completos para leitura offline
- Limpeza automática de caches obsoletos no `activate`

### 4.2 Limitações de Escala

**Carregamento de dados:**
- `DataStore.loadAll()` carrega 4 JSONs sequencialmente (podia ser paralelo, mas usa `Promise.allSettled`)
- ⚠️ Todos os dados do catálogo são carregados de uma vez — não há paginação/lazy loading para o catálogo. Com 7 famílias de obras isto é aceitável; com 100+ seria problemático.

**PWA UI strings:**
- Todas as strings de UI para 23 idiomas estão inline no `pwa/assets/app.js` (arquivo de 2053 linhas, ~80KB)
- ⚠️ Isto cresce linearmente com o número de idiomas. Separar em arquivos JSON como o site principal seria mais escalável.

**Service Worker:**
- `sw.js` usa cache versionado manualmente (`v15`). Bump manual é frágil — poderia usar hash de conteúdo.

**CSS:**
- `styles.css` tem 1557 linhas — organizado por seções, mas monolítico
- Não usa CSS modules ou ferramentas de build

---

## 5. PERFORMANCE — NOTA: 85/100 🟢

### 5.1 Otimizações Implementadas

- ✅ Script `theme-init.js` inline no `<head>` previne FOUC
- ✅ `app.js` carregado com `defer`
- ✅ Imagens com `loading="lazy"`
- ✅ Fontes self-hosted em WOFF2 (11 arquivos, ~3.2MB total, mas com caching)
- ✅ CSS custom properties evitam reflow em troca de tema
- ✅ Scroll passivo (`{ passive: true }`)
- ✅ `fetch` com `{ cache: 'no-cache' }` para dados — adequado para GitHub Pages que não tem cache headers configuráveis
- ✅ Placeholders de mídia — YouTube/TikTok iframes só carregam sob demanda

### 5.2 Preocupações

- ⚠️ 11 fontes TTF+WOFF2 (~3.2MB). O `fonts.css` carrega weights 300-700 de Inter e Cormorant Garamond. Nem todos os weights são usados — `font-display: swap` não está configurado, o que pode causar FOIT (Flash of Invisible Text).
- ⚠️ `pwa/assets/app.js` tem 2053 linhas (~80KB) inline com todas as strings de UI. Sem minificação/build step.
- ⚠️ `styles.css` (1557 linhas, ~48KB) sem minificação.

---

## 6. TESTES — NOTA: 80/100 🟢

### 6.1 Cobertura de Testes

| Tipo | Arquivo | Cobertura |
|------|---------|-----------|
| Unit (segurança) | `tests/security.test.js` | `escapeHtml`, `safeUrl`, `safeMediaId`, `isSafeYouTubeId`, `isSafeTikTokId`, `renderProse` |
| Unit (i18n) | `tests/i18n.test.js` | 23 idiomas, keys sincronizadas com fallback em `app.js` |
| Unit (API) | `tools/api/tests/api-contract.test.js` | Validação de contrato da API |
| Unit (build) | `tools/api/tests/build-catalog-script.test.js` | Script de build do catálogo |
| E2E (site) | `tests/app.spec.js` | Tema, idiomas, filtros, painel de auditoria |
| E2E (PWA) | `tests/pwa.spec.js` | Leitor offline, downloads, wishlist |
| E2E (API) | `tests/api.spec.js` | Smoke test de contrato da API |
| E2E (mobile) | `tests/mobile.spec.js` | Menu hamburguer, grid responsivo |
| E2E (prod) | `tests/prod.spec.js` | Smoke contra produção |
| E2E (works) | `tests/works.spec.js` | Páginas individuais de obras |
| A11y | `tests/accessibility.spec.js` | axe-core WCAG 2.1 AA |
| Dados | `scripts/validate-data.js` | Validação de schema |

### 6.2 Qualidade da Suite

- ✅ Cobertura de segurança com XSS payloads reais
- ✅ Testes de acessibilidade com axe-core
- ✅ Testes mobile com viewports Chrome + Safari
- ✅ Testes de produção contra `https://ai2m2ia.github.io`
- ✅ Servidor de teste customizado (`tests/server.js`) com proteção de path traversal
- ⚠️ Sem testes unitários para `DataStore`, `CatalogRenderer`, `ThemeManager`, `I18N`
- ⚠️ Sem testes de integração para o fluxo completo de troca de idioma + renderização de catálogo
- ⚠️ Limiar de cobertura 80% definido apenas para ferramentas de API e testes Node

---

## 7. CI/CD — NOTA: 90/100 🟢

### 7.1 Workflows

| Workflow | Gatilho | Função |
|----------|---------|--------|
| `ci.yml` | push/PR em main, develop, feature/** | Testes + auditoria npm + Playwright |
| `auto-pr-promotion.yml` | CI bem-sucedido em develop | PR automático develop→main |
| `auto-tag-main.yml` | CI bem-sucedido em main | Tag automático |
| `release-gate-review.yml` | PR para main | Revisão AI dual (Claude + Qwen) |
| `claude-mention.yml` | Comentário `@claude` | Revisão Claude sob demanda |
| `prod-smoke.yml` | Agendado | Smoke contra produção |

### 7.2 Qualidade

- ✅ Dependabot configurado
- ✅ Permissões mínimas (`contents: read`)
- ✅ Timeout de 15 minutos
- ✅ `npm audit --audit-level=high` como gate
- ✅ Upload de relatório Playwright em falha
- ✅ Pinned actions por SHA (não por tag)
- ✅ Concurrency controls para evitar corridas de PR/tag

### 7.3 Preocupações Menores

- ⚠️ `npm audit --audit-level=high` só falha com vulnerabilidades HIGH/CRITICAL. Moderadas são ignoradas.
- ⚠️ O workflow de produção smoke depende do site estar online — sem fallback.

---

## 8. MANUTENIBILIDADE — NOTA: 78/100 🟡

### 8.1 Pontos Fortes

- ✅ Documentação extensa: `README.md`, `AGENTS.md`, `SECURITY.md`, `CODE_REVIEW.md`, `AUDIT-REPORT.md`, `CONTRIBUTING.md`
- ✅ Separação clara de responsabilidades: site principal vs PWA vs API vs ferramentas
- ✅ Schemas JSON rigorosos para todos os dados
- ✅ Sistema de versionamento de cache (`?v=...` em scripts/CSS)
- ✅ Nomenclatura consistente (BEM-like para CSS, camelCase para JS)

### 8.2 Preocupações

- ⚠️ `app.js` (1003 linhas) e `pwa/assets/app.js` (2053 linhas) são arquivos monolíticos. Sem módulos ES6.
- ⚠️ Duplicação de funções de segurança: `escapeHtml()` existe tanto em `app.js:541` quanto em `pwa/assets/app.js`. Também duplicada em `tests/security.test.js`.
- ⚠️ `pwa/assets/app.js` tem UI strings para 23 idiomas inline — difícil de manter e revisar
- ⚠️ Sem ferramenta de build/bundling — tudo é servido como escrito
- ⚠️ Versionamento manual de cache (`v15` no SW, `?v=20260601a` nos assets)

---

## 9. PWA — NOTA: 82/100 🟢

### 9.1 Conformidade PWA

- ✅ Manifest válido com ícones 192x192 e 512x512
- ✅ Service Worker com estratégias `cache-first` e `stale-while-revalidate`
- ✅ Página offline (`offline.html`)
- ✅ Instalável com botão `Install`
- ✅ Leitura offline funcional com download de livros
- ✅ Wishlist e progresso de leitura salvos

### 9.2 Segurança da PWA

- ✅ `resolveApiUrl()` valida que URLs de API começam com `/api/` e pertencem à origem canônica
- ✅ `resolveConfiguredApiBaseUrl()` restringe origens a `localhost`, `127.0.0.1`, `[::1]`, ou `ai2m2ia.github.io`
- ✅ CSP específico com `worker-src 'self'`
- ✅ `renderProse()` com "sanitize first, then format"

### 9.3 Preocupações

- ⚠️ Sem ícone 192x192 e 512x512 como PNG — o manifest referencia `assets/icon-192.png` e `assets/icon-512.png`, mas só foi encontrado `assets/icon.svg` no diretório. Se os PNGs não existirem, a instalação PWA pode falhar em algumas plataformas.
- ⚠️ `display: standalone` sem `prefer_related_applications` — ok para este caso de uso
- ⚠️ `start_url: "./#library"` — o hash fragment é não-convencional

---

## 10. INTERNACIONALIZAÇÃO — NOTA: 88/100 🟢

### 10.1 Arquitetura

O sistema i18n é bem projetado:
- **Site principal:** fallback inglês hardcoded, 23 idiomas em `data/i18n/<lang>.json`
- **PWA:** strings inline no JS para todos os 23 idiomas
- **Cache inteligente:** `lastUpdated` date-driven, evita re-fetches desnecessários
- **RTL automático:** `ar`, `fa`, `he`, `ur` disparam `dir="rtl"`

### 10.2 Validação

- ✅ `tests/i18n.test.js` verifica que todos os 23 idiomas têm os mesmos keys
- ✅ Verificação de keys obrigatórios
- ✅ Sincronização entre `app.js` `_fallback` e `en.json`
- ✅ Todas as strings são não-vazias

### 10.3 Preocupações

- ⚠️ `chapterBlank` tem HTML inline (`<p>This chapter is blank.</p>`) nas strings de tradução — mistura conteúdo com marcação
- ⚠️ Funções de template (`count`, `generatedAt`, `booksCountForMode`, etc.) nas strings de tradução são frágeis — se a lógica mudar, todas as traduções precisam ser atualizadas
- ⚠️ `languageButtonLabel()` tem um mapa hardcoded com `pt-BR → PT-BR`, `es-419 → ES`, etc. Adicionar um idioma com mapeamento não-padrão requer alteração de código.

---

## 11. COMPATIBILIDADE E RESILIÊNCIA — NOTA: 88/100 🟢

### 11.1 Error Boundaries

O `DOMContentLoaded` handler em `app.js:934-1003` implementa múltiplos blocos try/catch:
- i18n init → erro logado, site continua com fallback
- DataStore → erro logado, renderização condicional
- Catálogo/Personagens → `showSectionError()` com mensagem amigável
- Mídia → `showSectionError()`
- Filosofia → erro logado, seção fica com "Loading…"
- UI interactions → erro logado

### 11.2 Resiliência de Rede

- ✅ i18n: fallback para cache localStorage, depois fallback inglês
- ✅ Dados: cache localStorage com `lastUpdated`, fallback para cache stale
- ✅ PWA: offline-first com Service Worker
- ✅ `offline.html` como fallback de navegação
- ✅ Respostas JSON/texto apropriadas para recursos não cacheados (503)

### 11.3 Compatibilidade

- ✅ `color-scheme: dark light` meta tag
- ✅ `prefers-color-scheme` detectado em `theme-init.js`
- ✅ `focus-visible` em vez de `:focus` para evitar anéis de foco em cliques de mouse
- ✅ `IntersectionObserver` não usado (bom — evita complexidade)
- ✅ `passive: true` em event listeners de scroll

---

## 12. RESUMO DE RISCOS

| Risco | Severidade | Probabilidade | Impacto |
|-------|-----------|---------------|---------|
| Contraste de cor abaixo de WCAG AA | 🔴 Alta | Certa | Usuários com baixa visão |
| Ícones PWA PNG ausentes | 🟡 Média | Média | Instalação PWA em algumas plataformas |
| Arquivos monolíticos (app.js 1003 linhas, PWA 2053 linhas) | 🟡 Baixa | Baixa | Dívida técnica de manutenção |
| Versionamento manual de cache | 🟡 Baixa | Baixa | Cache stale após deploy |
| Duplicação de funções de segurança | 🟢 Baixa | Baixa | Divergência de implementação |
| Sem SRI nos scripts | 🟢 Muito baixa | Muito baixa | CSP cobre este vetor |

---

## 13. CHECKLIST DE PRIORIDADES

Por ordem de urgência:

1. **Corrigir contraste de cor** — 55 violações WCAG, esforço estimado 30 min
2. **Verificar existência de ícones PWA PNG** — `assets/icon-192.png` e `assets/icon-512.png`
3. **Extrair funções de segurança duplicadas** para um módulo compartilhado
4. **Separar strings de UI da PWA** em JSON por idioma (como o site principal)
5. **Adicionar `font-display: swap`** ao `fonts.css`
6. **Adicionar `aria-live`** para regiões de carregamento dinâmico
7. **Testar com leitores de tela reais** (VoiceOver no macOS, NVDA no Windows)
8. **Considerar build step** para minificação e hash de cache automático

---

O projeto é notavelmente bem construído para um site estático sem framework. A postura de segurança é excelente (CSP estrito, sanitização consistente, validação de schema), a arquitetura de dados é limpa, e a suíte de testes é abrangente. Os pontos fracos concentram-se em acessibilidade (contraste) e manutenibilidade (arquivos monolíticos, duplicação). Nenhum risco de segurança explorável foi identificado.
