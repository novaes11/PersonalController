# Playbook de Desenvolvimento Cloud-Native — PersonalController

## 1. Visão Geral do Fluxo Autônomo

O objetivo deste playbook é permitir que o ciclo completo de planejamento, especificação, codificação e testes aconteça na nuvem, **eliminando a dependência do notebook local** para iniciar desenvolvimentos:

```text
┌────────────────────────┐
│      1. NOTION         │ 📱 Celular / Web: Criação da Task
│ Status: Ready For Dev  │
└───────────┬────────────┘
            │
            │ Gatilho agendado (Cron) ou manual (workflow_dispatch)
            ▼
┌────────────────────────┐
│  2. GITHUB ACTION      │ ⚙️ scripts/notion-github-sync.js
│   Notion Sync Worker   │
└───────────┬────────────┘
            │
            │ Ingestão de regras (/squad/agents/)
            ▼
┌────────────────────────┐
│  3. GEMINI PM / ARQ    │ 🧠 scripts/gemini-task-refiner.js
│  Refinamento Técnico   │ Gera Issue estruturada com critérios e AppSec
└───────────┬────────────┘
            │
            │ Criação da Issue com label 'copilot-agent'
            ▼
┌────────────────────────┐
│  4. GITHUB COPILOT     │ 🤖 Copilot Coding Agent na Nuvem
│     Coding Agent       │ Cria branch 'copilot/...', implementa e abre PR
└───────────┬────────────┘
            │
            │ Push de branch & abertura de PR
            ▼
┌────────────────────────┐
│  5. CI/CD AUTOMATION   │ 🛡️ GitHub Actions:
│   Jest + CodeQL + CI   │ - build-and-test (100% Jest)
│                        │ - CodeQL Security Analysis (SAST)
│                        │ - Vercel Preview Deployment
└───────────┬────────────┘
            │
            │ PR validado e pronto para aprovação
            ▼
┌────────────────────────┐
│  6. REVISÃO HUMANA     │ 👤 João Vitor Novaes (@novaes11)
│   Aprovação e Merge    │ 📱 Aprova e mergeia pelo GitHub Mobile ou Web
└───────────┬────────────┘
            │
            │ Merge na main -> CD na Vercel
            ▼
┌────────────────────────┐
│  7. PRODUÇÃO (Vercel)  │ 🚀 Dashboard atualizado online
└────────────────────────┘
```

---

## 2. Como Operar o Fluxo pelo Smartphone ou Navegador

### Passo 1: Criar a Tarefa no Notion
1. Abra o app do **Notion** no celular.
2. Adicione uma nova linha no banco de dados de tarefas do projeto:
   - **Task:** `[P0] Desenvolver exportação de extrato em CSV`
   - **Status:** Mude para `Ready For Development`.

### Passo 2: Disparar a Sincronização
- **Opção A (Automática):** O workflow agendado `.github/workflows/notion-sync.yml` roda a cada hora e captura a tarefa automaticamente.
- **Opção B (Manual no Celular):** Abra o app do **GitHub** no celular, acesse **Actions** → **Notion to GitHub Issue Sync** → **Run workflow**.

### Passo 3: Execução pelo Copilot Coding Agent
1. A GitHub Issue é criada com todas as instruções técnicas, requisitos de Mobile-First, RLS e critérios de teste.
2. O **GitHub Copilot Coding Agent** é notificado, cria uma branch remota, escreve o código com seus respectivos testes Jest e abre o Pull Request formatado conforme `.github/pull_request_template.md`.
3. Os checks de CI (`build-and-test`, `CodeQL Security Analysis`, `Vercel Preview`) rodam automaticamente.

### Passo 4: Revisão e Merge Manual por @novaes11
1. Abra a notificação do Pull Request no GitHub (celular ou web).
2. Verifique:
   - Se os testes Jest passaram (100%).
   - Se o CodeQL não encontrou vulnerabilidades.
   - O preview gerado pela Vercel.
3. Clique em **Merge pull request** e **Delete branch**.
4. O deploy de produção na Vercel ocorre automaticamente!

---

## 3. Resumo dos Papéis no Ecossistema

| Ferramenta | Papel Central |
| :--- | :--- |
| **Notion** | Gestão de roadmap, priorização e backlog |
| **Gemini** | PM Sênior e Arquiteto de Software (refinamento de escopo e critérios) |
| **GitHub Issues** | Ponto de partida único e formal para todo desenvolvimento |
| **GitHub Copilot** | Executor técnico na nuvem (código, testes e PRs) |
| **GitHub Actions** | Validação contínua (Jest, CodeQL, auditoria de secrets, sync) |
| **Vercel** | Hospedagem serverless da API e interface visual do dashboard |
| **João Vitor Novaes** | Aprovador final e tomador de decisão exclusivo |
