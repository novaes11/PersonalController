# Estratégia de Testes Automatizados — PersonalController

## 1. Princípios Gerais

- **100% Pass Rate:** Toda alteração no código deve manter 100% dos testes passando (`npm test`). Nenhuma quebra de suíte é tolerada.
- **Isolamento e Determinismo:** Os testes nunca devem depender de conexões de rede ativas com APIs externas (Brapi, AwesomeAPI, Supabase em produção). Mocks via `jest.fn()` ou `fetchMock` devem simular cenários de sucesso, timeout e erro de rede.

---

## 2. Estrutura de Testes

Os testes residem no diretório `/tests/`:
- `server.test.js`: Testes do entrypoint Express, health check e tratamento de erros.
- `auth.test.js` & `authz.test.js`: Autenticação e autorização via Supabase Auth e middlewares.
- `categories.test.js`: CRUD de categorias e isolamento por usuário.
- `transactions.test.js`: Criação, listagem paginada e exclusão de transações financeiras.
- `schemas-security.test.js`: Validação de Mass Assignment (SEC-04) rejeitando propriedades adicionais em schemas Zod.
- `rate-limit.test.js`: Validação dos limites de requisições por IP (SEC-05).
- `quotes.test.js`: Worker de cotações de mercado e resiliência a falhas de APIs externas.
- `portfolio.test.js`: Consolidação patrimonial e cálculo de rentabilidade.
- `design-system.test.js`: Presença de tokens CSS em 3 camadas, touch targets mobile-first e acessibilidade WCAG AA.
- `app-shell.test.js`: Responsividade do App Shell (Bottom Nav no mobile, Sidebar no desktop) e navegação por teclado.
- `auth-view.test.js`: Formulário de autenticação e Modo Demonstração (1 Clique).
- `kpi-cards.test.js`: Cálculos matemáticos de liquidez e percentual de burn rate.
- `asset-allocation-chart.test.js`: Geometria do Donut Chart SVG e percentuais de alocação de carteira.
- `recent-transactions-table.test.js`: Renderização de transações recentes, paginação e exclusão.
- `transaction-form.test.js`: Validação de entradas e submissão manual de transação.
- `dashboard-view.test.js`: View principal do dashboard, hierarquia na 1ª dobra e rotas `/dashboard` e `/app`.
