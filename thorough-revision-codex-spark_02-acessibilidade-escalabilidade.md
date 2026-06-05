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
