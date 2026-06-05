# Revisão Técnica Minuciosa — ai2m2ia.github.io (Parte 1)

## 1) Síntese executiva
A base do projeto está bem arquitetada para um site estático com camada de API e PWA, com forte preocupação em validação de dados e segurança (CSP, sanitização, validação de contrato, testes de regressão). No geral, o projeto é robusto, mas há riscos claros em três frentes: consistência de dados cruzados, estratégia de cache/atualização em service worker e algumas lacunas de resiliência/performance em persistência local e carregamento de dados.

Há foco relevante em automação (CI, testes de acessibilidade, segurança, schema/contract), o que reduz chance de regressões, mas não elimina riscos operacionais relacionados a escala e manutenção a longo prazo.

## 2) Arquitetura e organização geral

### Pontos positivos
- Separação por domínios clara:
  - Interface pública (`index.html`, estilos e scripts globais).
  - PWA (`pwa/`) com service worker, manifest e runtime próprio.
  - Pipeline de API/data (`api/`, `tools/api/`, `data/schemas/`) e validação forte.
  - Catálogos e conteúdos em JSON com contratos formais.
- Fluxo orientado a build de catálogo (`build_catalog.py`) com testes dedicados.
- Contrato e schema versionados (`catalog.schema.json`, `content.schema.json`, `api-contract.js`) para reduzir ruptura.

### Riscos e observações arquiteturais
- Existem múltiplos pontos de entrada (site principal e PWA) que replicam decisões de carregamento e cache; quando a lógica divergente cresce, aumenta a chance de drift de comportamento entre os clientes.
- A arquitetura é estática com renderização client-side a partir de JSONs locais/hosted; isso simplifica operação, mas exige cuidado em carga inicial/perf e consistência de versão dos recursos cacheados pelo SW.
- Há boa separação, mas faltam mecanismos explícitos de rastreabilidade entre versões de schema/artefatos e caches já existentes em navegadores, o que pode gerar comportamento divergente entre updates.

## 3) Segurança

### Pontos fortes
- CSP explícita nas páginas principais e páginas de work/PWA com política restritiva (sem `unsafe-inline`/`unsafe-eval`, baseadas em `self`, com fontes externas controladas).
- Funções de sanitização e encoding (ex.: `escapeHtml`) e validação de URL (`safeUrl`) presentes no app principal e no PWA.
- Validação de contrato e schema da API antes de servir/compartilhar catálogo.
- Testes automatizados cobrem cenários de origem de API e maliciosos para strings de input.
- Uso de `trusted-types` e/ou práticas defensivas no front (onde aplicável) é coerente com objetivo de reduzir vetores XSS.

### Achados (riscos)
- [Médio] **Inconsistência de versões de assets cacheados pelo SW** (escopo PWA).
  - O SW pre-cacheia paths com parâmetro de versão fixo para `app.js`, enquanto o runtime HTML pode referenciar uma versão distinta. Isso pode manter uma versão antiga após deploy até nova invalidação do SW, gerando comportamento inconsistente ou incompatibilidade silenciosa.
- [Médio] **Cacheamento de `/api/` com strategy ampla** no SW.
  - A política de cache para rotas de API pode manter payloads em stale-while-revalidate sem política explícita de expiração/evicção, aumentando superfície para inconsistência de dados e crescimento de armazenamento.
- [Baixo] **Persistência local com falhas silenciosas potenciais**.
  - A gravação/leitura de `localStorage` é ampla e funciona na maioria dos casos, mas falta centralização robusta de fallback para contextos com storage bloqueado (modo privado, quota, políticas corporativas), o que pode quebrar partes do fluxo em runtime sem aviso claro ao usuário.

### Recomendações de segurança
- Unificar versão do asset cacheado no SW com a versão efetivamente enviada no HTML (ou migrar para um método sem query-string hardcoded).
- Adicionar metadados de expiração/limpeza por cache de API e quotas com fallback para `network-only` quando exceder thresholds.
- Centralizar wrappers de storage (get/set/remove) com `try/catch` e fallback em memória para evitar falhas silenciosas.
- Garantir cabeçalhos de segurança adicionais no servidor/host estático (HSTS, Permissions-Policy, COOP/COEP dependendo do contexto de uso).

## 4) Consistência de dados e contratos

### Achados críticos
- Foram detectadas referências de `workIds` em `data/works.json` que não existem no índice de works atual (aprox. 10 ocorrências), por exemplo:
  - `level-zero-weakest-skill`
  - `level-zero-tdd`
  - `level-zero-journey-journey`
  - `level-zero-testing-mastery`
  - `level-zero-hack`
  - Entre outras referências equivalentes.

### Impacto
- Quebras de integridade referencial em tempo de render: links “morto”, recomendações sem detalhe, ou erros silenciosos em componentes que assumem relacionamento válido.
- Risco acumulado para SEO e experiência: páginas com relações quebradas e estatísticas inválidas.

### Recomendações de dados
- Adicionar validação cruzada no pipeline de `build_catalog` e/ou no `validate-data` para garantir que toda `workIds` referencie IDs existentes no catálogo.
- Tratar violações como falha de CI (fail-fast) em vez de confiar em tolerância implícita.
- Adicionar teste unitário dedicado para integridade referencial `workId -> work`.

## 5) Observações adicionais por risco
- A política de `cache: 'no-cache'` em algumas leituras pode reduzir ganho de cache e aumentar latência em usuários recorrentes; isso ajuda consistência imediata, mas prejudica desempenho em cenários de leitura frequente.
- O app tende a montar grandes blocos HTML via `innerHTML` após carregar catálogos inteiros; para escala maior, convém considerar paginação parcial, memoização de render e atualização incremental.
