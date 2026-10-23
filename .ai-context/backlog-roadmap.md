# Backlog & Roadmap de Evolução — PersonalController

## 1. Status dos Épicos Concluídos

- **Épico 01 — Fundação Arquitetural & Banco de Dados (Supabase & RLS)**: Concluído ✅
- **Épico 02 — Gestão Transacional & Regras de Negócio (Categorias e Transações)**: Concluído ✅
- **Épico 03 — Inteligência de Mercado & Portfólio Consolidado**: Concluído ✅
  - `E03.T01`: Schemas e Migrações de Ativos / Carteira.
  - `E03.T02`: Worker de Cotações de Mercado (Brapi / AwesomeAPI).
  - `E03.T03`: Endpoint de Portfólio Consolidado (`GET /portfolio/consolidated`).
- **Épico 04 — Componentes Analíticos e Visualização Frontend**: Concluído ✅
  - `E04.T01`: Formulário de Input Manual de Transação.
  - `E04.T02`: Tabela de Transações Recentes com Paginação e Exclusão.
  - `SEC-05`: Implementação de Rate Limiting.
  - `E04.T03`: Cards de KPIs (Liquidez e Burn Rate).
  - `E04.T04`: Gráfico Donut de Distribuição de Ativos.

---

## 2. Épico Atual: Épico 05 — Design System & Interface Visual Mobile-First

- `E05.T01`: Fundações do Design System e Tokens CSS Mobile-First (3 camadas). ✅ Concluído
- `E05.T02`: App Shell Responsivo: Bottom Nav (Mobile) e Sidebar (Desktop). ✅ Concluído
- `E05.T03`: Tela de Autenticação (/login, /signup) e Modo Demo Interativo. ✅ Concluído
- `E05.T04`: Integração da View Principal do Dashboard e Rota Visual (`/dashboard`). ✅ Concluído
- `E05.T05`: Experiência Mobile de Transações (Bottom Sheet / Modal + Lista Responsiva). ⏳ Próxima tarefa
- `E05.T06`: View Dedicada de Carteira de Investimentos & Sincronização de Cotações. ⏳ Planejada

---

## 3. Roadmap da Esteira de Automação Cloud-Native

- **Fase 1 — Preparação do Repositório**: Instruções do Copilot (`.github/copilot-instructions.md`), base de contexto em `.ai-context/`, revisão de agentes e secret scanning no CI.
- **Fase 2 — GitHub Issues como Fonte**: Criação de Issue Templates (`.github/ISSUE_TEMPLATE/`) para bugs, features e refatorações.
- **Fase 3 — Adoção do Copilot Coding Agent**: Teste de tarefas atribuídas ao Copilot Agent diretamente na nuvem.
- **Fase 4 — Revisão Automatizada com CodeQL**: Ativação de análise estática e segurança avançada nos Pull Requests.
- **Fase 5 & 6 — Integração Notion ↔ GitHub com Gemini PM**: Sincronização de tasks "Ready For Development" para criação automática de issues refinadas.
- **Fase 7 — Fluxo Cloud-Native Completo**: Início de tarefas sem necessidade de ligar o notebook.
