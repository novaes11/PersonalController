# PersonalController 📊💰

> Plataforma moderna e modular de gestão financeira pessoal, tomada de decisão e consolidação de carteira de investimentos (Ações B3, Criptoativos e Câmbio).

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
4. **Isolamento de Dados (RLS):** Toda query ao banco de dados passa por políticas estritas de Row Level Security no PostgreSQL.

---

## 🏗️ Arquitetura & Stack Técnica

| Camada | Tecnologia | Hospedagem / Free Tier |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite, Tailwind CSS, Lucide Icons, Recharts | [Vercel](https://vercel.com) (Deploy contínuo da `main`) |
| **Backend Core** | Python (FastAPI) & Node.js (Health Check / Workers) | [Render](https://render.com) (Web Service gratuito) |
| **Banco de Dados** | PostgreSQL 17 + Supabase Auth | [Supabase](https://supabase.com) (Free Tier 500 MB) |
| **Cotações B3** | Brapi API | [brapi.dev](https://brapi.dev) (Token gratuito) |
| **Cotações Fiat** | AwesomeAPI | [awesomeapi.com.br](https://docs.awesomeapi.com.br) (Pública e gratuita) |
| **CI / CD** | GitHub Actions | Ubuntu Runners com Jest e verificação de integridade |

Para detalhes aprofundados sobre diagramas C4 e modelos conceituais, consulte [docs/architecture-spec.md](docs/architecture-spec.md).

---

## 📁 Estrutura do Repositório

```text
PersonalController/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Esteira de CI (Build e Jest no PR para main)
│       └── ai-review.yml          # AI Squad Orchestrator (workflow_dispatch e automação)
├── .githooks/
│   └── pre-commit                 # Hook de segurança: bloqueia vazamento de segredos e .env
├── docs/
│   └── architecture-spec.md       # Especificação técnica completa do MVP
├── supabase/
│   ├── config.toml                # Configuração do Supabase CLI
│   └── migrations/
│       └── 20261008230000_create_users_table.sql # DDL da tabela users (perfil 1:1 com auth)
├── .env.example                   # Template seguro de variáveis de ambiente
├── .gitattributes                 # Normalização de finais de linha (LF para hooks)
├── .gitignore                     # Bloqueio de arquivos temporários, caches e credenciais
├── package.json                   # Metadados do projeto e scripts de teste
├── server.js                      # Servidor Express (API de Health Check / Tracer Bullet)
└── server.test.js                 # Testes unitários com Supertest e Jest
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

### 5. Iniciar o Servidor Local
```bash
npm start
# Servidor disponível em: http://localhost:3000/health
```

---

## 🔒 Segurança por Design (AppSec)

O projeto segue as diretrizes da **Auditoria AppSec de 19 Pontos**:
* **SEC-01 (Gestão de Segredos):** Bloqueio ativo de segredos via pre-commit hook e isolamento de chaves.
* **SEC-02 (Row Level Security):** RLS habilitado por padrão em todas as tabelas do PostgreSQL.
* **SEC-03 (Validação JWT):** Validação server-side de tokens com permissões mínimas.
* **SEC-04 (Pydantic Strictness):** Blindagem contra *Mass Assignment* (`extra = 'forbid'`).
* **SEC-05 (Rate Limit & Hardening):** Limitação de taxa em rotas sensíveis e cabeçalhos de segurança.

---

## 📋 Status do Desenvolvimento (WBS)

| Código | Tarefa | Contexto | Prioridade | Status |
| :---: | :--- | :---: | :---: | :---: |
| **SEC-01** | Configurar Gestão de Segredos (`.env`, Git Hooks) | Security | P0 | 🟢 **Concluído** |
| **E01.T01** | Modelar tabela `users` no PostgreSQL (Supabase) | Data | P0 | 🟢 **Concluído** |
| **E02.T01** | Modelar tabelas `categories` e `transactions` | Data | P0 | 🟡 *Próxima* |
| **E03.T01** | Modelar tabelas `assets` e `portfolio_positions` | Data | P0 | ⚪ Backlog |
| **SEC-02** | Implementar Supabase RLS (Row Level Security) | Security | P0 | ⚪ Backlog |
| **E01.T02** | Configurar Provider de Autenticação | Backend | P0 | ⚪ Backlog |
| **SEC-03** | Validação de JWT e AuthZ no FastAPI | Backend | P0 | ⚪ Backlog |

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte `package.json` para obter mais informações.
