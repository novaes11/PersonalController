# Arquitetura do Sistema — PersonalController

## 1. Visão Geral
O **PersonalController** é uma plataforma modular de gestão financeira pessoal e consolidação de carteira de investimentos (Ações B3, Fundos Imobiliários, Criptoativos e Câmbio), com foco em **custo zero de infraestrutura ($0/mês)** e segurança em profundidade.

```text
┌────────────────────────────────────────────────────────┐
│                   Cliente / Navegador                  │
│       SPA Mobile-First (HTML5 + Tailwind + Tokens)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│              Backend Express (Vercel Serverless)       │
│  - server.js / api/index.js                            │
│  - Middlewares: CORS, RateLimit (SEC-05), Auth (JWT)   │
│  - Controllers & Zod Schemas (.strict() SEC-04)       │
└──────────────┬─────────────────────────┬───────────────┘
               │                         │
               ▼                         ▼
┌─────────────────────────────┐ ┌────────────────────────┐
│     Supabase PostgreSQL     │ │      APIs de Cotações  │
│  - Tabelas: users,          │ │  - Brapi.dev (B3)      │
│    categories, transactions,│ │  - AwesomeAPI (Câmbio) │
│    assets, portfolio        │ │  - CoinGecko (Cripto)  │
│  - RLS: (SELECT auth.uid()) │ └────────────────────────┘
└─────────────────────────────┘
```

---

## 2. Camadas do Sistema

### A. Frontend (Mobile-First SPA)
- **Localização:** `src/frontend/`
- **Componentes:**
  - `styles/design-tokens.css`: Design System em 3 camadas (Primitive, Semantic e Component) com suporte a Dark/Light Mode e breakpoints mobile-first.
  - `components/AppShell.js`: App Shell adaptativo com Top Header enxuto, Bottom Navigation Bar fixa no mobile (`h-16 md:hidden`) com botão central `+ Nova Transação` (`>= 48px`), Sidebar no desktop (`hidden md:flex md:w-64`) e divisor da Área Experimental (`Inbox / Produtividade`).
  - `components/DashboardView.js`: View principal com hierarquia Mobile-First na 1ª dobra (Cards de Liquidez e Burn Rate) e 2ª dobra (Gráfico Donut e Tabela Recente).
  - `components/KpiCards.js`: Indicadores de liquidez de curto prazo, receitas, despesas e percentual de burn rate.
  - `components/AssetAllocationChart.js`: Gráfico Donut em SVG puro com legenda de alocação por classe de ativo.
  - `components/RecentTransactionsTable.js`: Tabela responsiva com paginação e exclusão com feedback visual.
  - `components/TransactionForm.js`: Formulário manual de transações com validação e feedback.
  - `components/AuthView.js`: Tela de autenticação e botão de 1 Clique para o Modo Demonstração.
  - `pages/renderAppPage.js`: Gerador de documento HTML5 completo servido em `GET /dashboard` e `GET /app`.

### B. Backend API (Node.js Express)
- **Servidor:** `server.js` e entrypoint serverless `api/index.js`.
- **Rotas:**
  - `/categories`: CRUD de categorias do usuário e do sistema.
  - `/transactions`: Registro, listagem paginada e exclusão de movimentações financeiras.
  - `/auth`: Login, Signup, Logout e Perfil integrados ao Supabase Auth.
  - `/portfolio`: Posição consolidada de investimentos (`GET /portfolio/consolidated`).
  - `/cron`: Worker agendado de sincronização de cotações de mercado.
  - `/dashboard` e `/app`: Rota visual SPA servindo a interface completa no navegador.

### C. Banco de Dados & Armazenamento (Supabase PostgreSQL)
- **Migrações:** `supabase/migrations/`
- **Políticas de Acesso:** Row Level Security (RLS) habilitado em 100% das tabelas que armazenam dados do usuário.
- **Relacionamentos:** Perfis de usuários mapeados 1:1 com a tabela interna `auth.users`.
