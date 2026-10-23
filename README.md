# PersonalController 📊💰

> Plataforma moderna e modular de gestão financeira pessoal, tomada de decisão e consolidação de carteira de investimentos (Ações B3, Fundos Imobiliários, Criptoativos e Câmbio).

[![CI Pipeline](https://github.com/novaes11/PersonalController/actions/workflows/ci.yml/badge.svg)](https://github.com/novaes11/PersonalController/actions/workflows/ci.yml)
[![AI Squad Orchestrator](https://github.com/novaes11/PersonalController/actions/workflows/ai-review.yml/badge.svg)](https://github.com/novaes11/PersonalController/actions/workflows/ai-review.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Database: PostgreSQL 17](https://img.shields.io/badge/Database-PostgreSQL%2017%20(Supabase)-336791.svg)](https://supabase.com)

---

## 🎯 Visão Geral

O **PersonalController** foi concebido por um Squad de Engenharia e Produto com foco estrito em **custo zero de infraestrutura ($0/mês)**, segurança rigorosa desde o dia zero e arquitetura desacoplada.

O MVP elimina métricas de vaidade e foca em **dados acionáveis**:
1. **Fluxo de Caixa Descomplicado:** CRUD de receitas e despesas com categorização e liquidez imediata.
2. **Carteira de Ativos Consolidada:** Cotações automatizadas de ações brasileiras (B3 via [brapi.dev](https://brapi.dev)), moedas fiat ([AwesomeAPI](https://docs.awesomeapi.com.br)) e criptoativos ([CoinGecko](https://www.coingecko.com)).
3. **Autenticação Segura:** Autenticação desacoplada gerenciada pelo Supabase Auth.
4. **Isolamento de Dados (RLS):** Toda query ao banco de dados passa por políticas estritas de Row Level Security no PostgreSQL (`(SELECT auth.uid())`).
5. **Interface Visual Mobile-First:** Single-Page Application responsiva com ergonomia na *thumb zone* (Bottom Navigation Bar no mobile e Sidebar lateral no desktop).

---

## 🏗️ Arquitetura & Stack Técnica

| Camada | Tecnologia | Hospedagem / Free Tier |
| :--- | :--- | :--- |
| **Frontend** | SPA Isomórfica, Tailwind CSS CDN, Design Tokens CSS (3 camadas) | [Vercel](https://vercel.com) (Deploy contínuo da `main`) |
| **Backend Core** | Node.js Express (Serverless) | [Vercel](https://vercel.com) (Deploy contínuo via GitHub Actions) |
| **Banco de Dados** | PostgreSQL 17 + Supabase Auth | [Supabase](https://supabase.com) (Free Tier 500 MB) |
| **Cotações B3** | Brapi API | [brapi.dev](https://brapi.dev) (Token gratuito) |
| **Cotações Fiat** | AwesomeAPI | [awesomeapi.com.br](https://docs.awesomeapi.com.br) (Pública e gratuita) |
| **CI / CD** | GitHub Actions | Ubuntu Runners com Jest, CI em PRs e CD na `main` |

Para detalhes aprofundados sobre especificações arquiteturais, consulte [docs/architecture-spec.md](docs/architecture-spec.md) e a base de contexto em [`.ai-context/`](.ai-context/).

---

## 🤖 Esquadrão de Agentes & Engenharia Assistida por IA

O desenvolvimento do PersonalController é coordenado por um esquadrão de agentes especializados e instruído para execução tanto local (via Antigravity) quanto na nuvem (via GitHub Copilot):

```text
squad/agents/
├── engineering-code-reviewer.md
├── engineering-codebase-onboarding-engineer.md
├── engineering-minimal-change-engineer.md
├── project-manager-senior.md
├── security-appsec-engineer.md
├── specialized-codebase-archaeologist.md
├── specialized-document-generator.md
└── testing-test-automation-engineer.md
```

- **Diretrizes para o GitHub Copilot:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **Base de Contexto para IAs:** [`.ai-context/`](.ai-context/)
- **Padrão de Pull Requests:** [`.agents/skills/pr-formatter/`](.agents/skills/pr-formatter/) e [`.github/pull_request_template.md`](.github/pull_request_template.md)

---

## 📁 Estrutura do Repositório

```text
PersonalController/
├── .ai-context/                   # Base de conhecimento e contexto técnico para agentes e Copilot
├── .agents/skills/pr-formatter/   # Skill oficial de formatação de Pull Requests
├── .github/
│   ├── copilot-instructions.md    # Instruções mestras para o GitHub Copilot Coding Agent
│   ├── pull_request_template.md   # Template oficial de Pull Requests
│   └── workflows/
│       ├── ci.yml                 # Esteira de CI (Build, auditoria de secrets e Jest)
│       ├── deploy.yml             # Esteira de CD (Deploy automático na Vercel)
│       └── quotes-cron.yml        # Automação de cotações periódicas
├── .githooks/
│   └── pre-commit                 # Hook de segurança: bloqueia vazamento de segredos e .env
├── api/
│   └── index.js                   # Entrypoint serverless da API Express para a Vercel
├── docs/
│   └── architecture-spec.md       # Especificação técnica completa do MVP
├── squad/                         # Definição do Squad de Agentes de Engenharia e Produto
├── src/
│   ├── controllers/               # Controladores REST
│   ├── frontend/                  # Componentes visuais, Design Tokens e App Shell SPA
│   ├── middlewares/               # Rate limit (SEC-05), autenticação e tratamento de erros
│   ├── routes/                    # Rotas da API e rota visual (/dashboard)
│   ├── schemas/                   # Schemas Zod estritos (SEC-04)
│   └── services/                  # Clientes Supabase, cotações e portfólio
├── supabase/
│   └── migrations/                # DDLs e políticas RLS versionadas
├── tests/                         # Suíte de testes automatizados (17 suítes / 120 testes)
├── server.js                      # Servidor Express
└── vercel.json                    # Configuração de roteamento da Vercel
```

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone git@github.com:novaes11/PersonalController.git
cd PersonalController
```

### 2. Ativar o Hook de Segurança (Obrigatório)
O repositório possui um hook de pre-commit que impede commits acidentais de arquivos `.env` ou chaves de nuvem:
```bash
git config core.hooksPath .githooks
```

### 3. Configurar Variáveis de Ambiente
Copie o template para criar o seu arquivo `.env`:
```bash
cp .env.example .env
```
> ⚠️ **Atenção:** Nunca comite o arquivo `.env`. Em produção, cadastre os valores no **GitHub Environment Secrets** (`production`).

### 4. Instalar Dependências e Executar Testes
```bash
npm install
npm test
```

### 5. Iniciar o Servidor Local & Visualizar a Aplicação
```bash
npm start
```
- **API Health Check:** `http://localhost:3000/health`
- **Dashboard Visual SPA:** `http://localhost:3000/dashboard`

---

## 🔒 Segurança por Design (AppSec)

O projeto segue as diretrizes da **Auditoria AppSec de 19 Pontos**:
* **SEC-01 (Gestão de Segredos):** Bloqueio ativo de segredos via pre-commit hook, CI scanner e isolamento de chaves.
* **SEC-02 (Row Level Security):** RLS habilitado por padrão em 100% das tabelas do PostgreSQL (`(SELECT auth.uid())`).
* **SEC-03 (Validação JWT):** Validação server-side de tokens com permissões mínimas.
* **SEC-04 (Blindagem contra Mass Assignment):** Schemas Zod configurados com `.strict()`.
* **SEC-05 (Rate Limit & Hardening):** Limitação de taxa em rotas de autenticação e rotas gerais da API.

---

## 📄 Licença

Distribuído sob a licença **MIT**.
