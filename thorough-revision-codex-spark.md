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
# Revisão Técnica Minuciosa — ai2m2ia.github.io (Parte 2)

## 6) Acessibilidade

### Pontos positivos
- Existe suíte de testes explícita de acessibilidade para várias rotas, o que indica preocupação prática com regressão de WCAG/ARIA.
- Há estrutura semântica visível em páginas principais e uso de componentes repetíveis que favorecem padrão consistente.
- Existem atributos de linguagem e estruturas de navegação pensadas para interação por teclado.

### Riscos/limitações observados
- Não há evidência clara (na leitura) de padronização total de landmarks/labels para todos os estados dinâmicos de renderização de filtros, busca e painéis interativos.
- Em controles estilo “tab” ou toggles de biblioteca, a semântica ARIA pode não refletir completamente estado/seleção atual em todas as variantes.
- Falta reforço de `aria-live`/feedback de estado em alguns updates dinâmicos de listas/contador (especialmente em troca de idioma e atualização de filtros).
- O teste de acessibilidade está presente, mas a validação manual de UX com leitores de tela e navegação por teclado de borda ainda parece complementar (recomendada).

### Recomendações de acessibilidade
- Padronizar contratos de componentes interativos:
  - Botões tipo aba: `role="tab"`, `aria-selected`, `aria-controls`.
  - Painéis: `role="tabpanel"` com `id` estável.
- Garantir que toda mudança de lista/cálculo relevante dispare mensagem em `aria-live="polite"`.
- Revisar contraste com token de tema padrão e contraste mínimo em todos os estados (inclusive foco em dark/light e estados hover/active).
- Validar contraste e navegação teclado com testes reais em NVDA/VoiceOver/Orca para além de regras automatizadas.

## 7) Escalabilidade, desempenho e confiabilidade

### Achados
- O carregamento inicial parece concentrar a leitura de múltiplos JSONs e montagem completa da UI em lote. Em catálogos pequenos estável; em crescimento, há risco de aumento de TTI.
- Estratégias de cache de rede/scope misturam `no-cache` em alguns fluxos com SW para outros; isso impede reaproveitamento ideal em sessões repetidas.
- O SW oferece fallback offline, porém depende de pré-cache e de caminhos listados; recursos não previstos ficam sujeitos a falhas de disponibilidade em cenários de rede degradada.

### Escalabilidade recomendada
- Introduzir cache de dados com versionamento explícito + invalidação por build hash, em vez de combinar `no-cache` com política manual.
- Implementar render lazy/virtualizado para listas longas (catálogo e cards).
- Evitar parsing repetitivo e reconstrução total do DOM em cada mudança de filtro; usar atualização incremental.
- Implementar métrica simples de performance no build e no runtime (TTI/INP/CLS) para guiar thresholds de refatoração.
- Considerar chunking de catálogo por idioma/segmento para reduzir payload inicial.

## 8) Confiabilidade operacional e resiliência

### Achados
- O sistema de fallback para dados ausentes existe, mas em alguns pontos a recuperação é silenciosa.
- A coexistência entre `localStorage` e estado derivado do backend/local files depende de ambiente; falhas de storage geram degradação silenciosa.

### Recomendações
- Definir um “estado de erro explícito” no UI para falhas de carga/parse de dados (ex.: banner global e botão retry).
- Implementar retry exponential backoff em fetch de catálogo/conteúdo, especialmente em ambiente móvel.
- Normalizar comportamento de erro com telemetria local opcional (sem dados sensíveis).

## 9) Testes, qualidade e governança

### Pontos fortes
- Cobertura ampla de testes: acessibilidade, segurança, API, catálogo, PWA, mobile, smoke/prod.
- Pipeline de CI já contempla qualidade além de build estático.
- Contratos e schemas dão base para evolução segura.

### Lacunas possíveis
- Alguns riscos estruturais (integridade referencial, semântica acessível completa, políticas de cache em escala) podem escapar de testes atuais por serem “cross-cutting” e não estarem em caso de teste dedicado.
- Falta suíte dedicada para cenários de falha de `localStorage` e de SW storage exhaustion.

### Recomendações de QA
- Criar testes unitários para:
  - Integridade referencial `workIds -> works`.
  - Comportamento de storage indisponível.
  - Estratégia de invalidação de SW com mudança de versão.
- Adicionar testes de regressão de desempenho com dataset sintético expandido.

## 10) Priorização de ação (roadmap recomendado)

### Prioridade Alta (1-2 sprints)
1. Corrigir validação cruzada de `workIds` ausentes no catálogo (falha de consistência).
2. Alinhar versionamento de assets no SW para evitar drift entre cache persistente e código atual.
3. Incluir contrato explícito de expiração/evicção no cache de API.

### Prioridade Média
4. Fortalecer persistência com wrappers de storage resilientes a bloqueios.
5. Padronizar semântica de acessibilidade dos controles interativos (tabs/toggles/painéis).
6. Melhorar feedback de falhas de carregamento e updates dinâmicos para leitores de tela.

### Prioridade Baixa
7. Ajustar estratégia de performance de render inicial e atualização incremental.
8. Ampliar cobertura de testes para cenários de stress de dados (catálogos maiores).
