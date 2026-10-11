# Relatório Executivo de Status Arquitetural (MVP Architecture Status Report)

**Documento:** Arquitetura do Sistema — Estado Atual e Decisões Técnicas  
**Público-alvo:** Tech Leads, Staff Engineers e Arquitetos de Soluções  
**Autor:** Document Generator (`specialized-document-generator` — Código 16.45)  
**Versão:** 1.0.0 (Status Oficial do MVP)  
**Data:** 11 de Outubro de 2026  
**Status do Sistema:** Operacional em Produção (`https://personalcontroller.vercel.app`)  

---

## 1. Sumário Executivo (Executive Summary)

O **PersonalController** é uma plataforma distribuída de gestão financeira pessoal e consolidação de portfólio de investimentos (B3, Criptoativos e Câmbio), projetada sob a premissa de **custo zero de infraestrutura ($0/mês)** e **segurança defensiva desde o dia zero**.

Nesta fase do projeto, o sistema concluiu com sucesso o estágio de **Bootstrap Estrutural e Tracer Bullet**:
* A esteira de integração contínua (CI) e entrega contínua (CD) está 100% automatizada.
* A infraestrutura de backend está publicada na nuvem global da Vercel via funções serverless.
* O modelo de banco de dados relacional foi iniciado no PostgreSQL 17 (Supabase) com isolamento nativo por Row Level Security (RLS).
* O repositório conta com governança ativa contra vazamento de credenciais e auditoria de código via agentes autônomos.

Este documento formaliza o estado técnico real do projeto, as decisões de arquitetura adotadas (ADRs), a topologia do sistema e o plano de evolução técnica.

---

## 2. Topologia do Sistema e Diagramas Arquiteturais

### 2.1. Diagrama de Contêineres e Infraestrutura (C4 Nível 2)

```mermaid
flowchart TD
    subgraph Clients["Camada de Apresentação (Planejada)"]
        SPA["Frontend SPA (React 18 + Vite)\n[Hospedagem: Vercel]"]
    end

    subgraph Edge["Camada de Borda & Roteamento (Ativa)"]
        Proxy["Vercel Edge Network / Reverse Proxy\n[Regras: vercel.json]"]
    end

    subgraph Backend["Camada de Aplicação Serverless (Ativa)"]
        API["Node.js Express 5.x API Gateway\n[Entrypoint: api/index.js & server.js]"]
    end

    subgraph DataLayer["Camada de Dados & Segurança (Ativa)"]
        SupaAuth["Supabase Auth Engine\n[JWT Issuer & Sessões]"]
        PG["PostgreSQL 17 Database\n[Tabelas: public.users / RLS Ativo]"]
    end

    subgraph ExternalAPIs["Provedores Externos de Mercado (Integrados ao Modelo)"]
        Brapi["Brapi.dev API\n[Ações B3]"]
        Awesome["AwesomeAPI\n[Câmbio Fiat]"]
        CoinGecko["CoinGecko API\n[Criptomoedas]"]
    end

    subgraph DevOps["Esteira de Engenharia & Governança (Ativa)"]
        GHA["GitHub Actions Runners\n[CI Jest + CD Vercel + Squad IA]"]
        Notion["Notion API\n[Backlog & Task Board]"]
    end

    SPA -.->|HTTPS / JSON| Proxy
    Proxy -->|Rewrites /(.*)| API
    API -->|PostgREST / Supabase Client| PG
    API -->|Validação de JWT| SupaAuth
    API -.->|Cotações| Brapi
    API -.->|Cotações| Awesome
    API -.->|Cotações| CoinGecko
    GHA -->|Deploy Automático na main| Proxy
    GHA -.->|Sync de Tarefas| Notion
```

---

### 2.2. Topologia de Diretórios do Repositório

O projeto adota uma estrutura modular organizada por responsabilidades estritas:

```text
PersonalController/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Pipeline de CI: Build e Jest em Pull Requests para main
│       ├── deploy.yml             # Pipeline de CD: Build, Vercel Deploy e Health Check na main
│       └── ai-review.yml          # AI Squad Orchestrator: Triagem via DAG com Gemini e Notion
├── .githooks/
│   └── pre-commit                 # AppSec Hook: Bloqueio estático de .env, JWTs e cloud keys
├── .squad/
│   ├── squad-config.yml           # Manifesto SHA-256 e limites operacionais dos agentes
│   └── agents/                    # Catálogo de agentes especialistas (PM, Security, QA, Docs)
├── .agents/
│   └── skills/                    # Habilidades complementares do Antigravity (UI, Design System)
├── api/
│   └── index.js                   # Adaptador Serverless: exporta o app Express para a Vercel
├── docs/
│   ├── architecture-spec.md       # Especificação conceitual do produto e domínios de negócio
│   ├── audit-report.md            # Relatório de auditoria arqueológica da base de código
│   └── architecture-status.md     # Este documento (Status oficial da arquitetura técnica)
├── supabase/
│   ├── config.toml                # Configuração do Supabase CLI local
│   └── migrations/
│       └── 20261008230000_create_users_table.sql # DDL de users (1:1 com auth.users, RLS on)
├── .env.example                   # Template sanitizado de variáveis de ambiente do projeto
├── .gitattributes                 # Normalização de line endings (LF para shell scripts)
├── .gitignore                     # Exclusão estrita de segredos, caches e build artifacts
├── package.json                   # Dependências, metadados e scripts de teste
├── server.js                      # Core da API Express (Roteador, normalização de paths, /health)
├── server.test.js                 # Testes unitários e de integração com Supertest e Jest
└── vercel.json                    # Configuração de proxy e rewrites para serverless functions
```

---

## 3. Registro de Decisões de Arquitetura (ADRs - Architecture Decision Records)

### ADR-01: Adoção de Serverless na Vercel para a API Core
* **Contexto:** A especificação original planejava containers Docker no Render. O plano gratuito do Render possui "cold sleep" severo (inatividade congela o serviço e a reativação demora de 50 a 90 segundos), prejudicando a experiência de consumo da API.
* **Decisão:** Hospedar a API inicial em funções Serverless na Vercel (`api/index.js` + `server.js`).
* **Consequências Positivas:**
  * Latência zero de reativação com CDN global Anycast.
  * Preview Deployments automáticos gerados a cada Pull Request aberto.
  * Custo $0 garantido dentro do generous tier da Vercel.
* **Consequências Negativas (Trade-offs):**
  * O runtime serverless é *stateless* e tem limite de execução de 10-15s por requisição.
  * Workers contínuos em background (como Celery beat) não podem rodar dentro da mesma instância e demandarão cron jobs via Vercel Cron ou mensageria externa (ex: Upstash QStash).

---

### ADR-02: Segurança Centrada no Banco de Dados via Supabase RLS
* **Contexto:** Em aplicações financeiras, a maior vulnerabilidade é a visualização indevida de transações de terceiros (falhas de *Broken Object Level Authorization* / BOLA).
* **Decisão:** O banco de dados PostgreSQL é a autoridade suprema de autorização. Toda tabela de domínio possui `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`. A tabela `public.users` não gera UUID arbitrário; sua chave primária herda diretamente o `id` da tabela `auth.users` (`REFERENCES auth.users(id) ON DELETE CASCADE`).
* **Consequências:**
  * Mesmo que uma query no backend esqueça de filtrar `WHERE user_id = :id`, o PostgreSQL bloqueia a leitura no nível do motor.
  * Simplificação de políticas RLS: `USING (auth.uid() = id)`.

---

### ADR-03: Segregação Estrita de Ambientes via GitHub Environments
* **Contexto:** Garantir que deploys de produção só ocorram a partir de código aprovado e testado.
* **Decisão:** Criação do Environment `production` no GitHub com a regra de proteção *Deployment Branch Policy* restrita à branch `main`.
* **Consequências:**
  * Nenhuma branch de feature ou pull request tem acesso aos secrets de produção nem pode disparar alterações no domínio público.
  * Rastreabilidade total com registro de histórico em `https://github.com/novaes11/PersonalController/deployments`.

---

### ADR-04: Normalização de Paths no Express para Compatibilidade Serverless
* **Contexto:** Ao usar funções serverless com Express na Vercel, o proxy reverso reescreve requisições com o path físico (`/api/index.js`), o que causava erro `404 Cannot GET /api/index.js` no roteador do Express.
* **Decisão:** Implementação de um middleware de normalização e montagem dual do roteador:
  ```javascript
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/index.js')) {
      req.url = req.url.replace('/api/index.js', '') || '/';
    }
    next();
  });
  app.use('/', router);
  app.use('/api', router);
  ```
* **Consequências:** Paridade absoluta: o mesmo código responde perfeitamente nos testes unitários locais (`npm test` via Supertest), em chamadas diretas (`/health`) e sob o proxy da Vercel (`/api/health`).

---

### ADR-05: AppSec "Shift-Left" via Git Hooks e Auditoria Estática
* **Contexto:** Prevenir vazamento acidental de chaves de API, credenciais de banco e tokens de nuvem no controle de versão.
* **Decisão:** Criação de um pre-commit hook customizado em `.githooks/pre-commit` com varredura por regex de chaves de provedores (AWS, Google, PEM, JWTs, Supabase keys) e bloqueio obrigatório de qualquer arquivo `.env` staged.
* **Consequências:** Nenhum segredo atinge o histórico do Git, evitando a necessidade de rotação de credenciais de emergência.

---

## 4. Stack Tecnológico Consolidado (Tecnologias em Uso)

| Camada | Tecnologia | Versão | Função na Arquitetura |
| :--- | :--- | :---: | :--- |
| **Runtime de Execução** | Node.js | `20.x` / `24.x` | Ambiente de execução JavaScript server-side |
| **Framework HTTP** | Express.js | `^5.2.1` | API Gateway, roteamento HTTP e health checks |
| **Hospedagem & CDN** | Vercel Serverless | — | Edge Network, DNS, SSL automático e Serverless Compute |
| **Banco de Dados** | PostgreSQL | `17` | Armazenamento relacional ACID (hospedado no Supabase) |
| **Mecanismo de Auth** | Supabase Auth | — | Autenticação gerenciada, emissão de JWTs e RLS context |
| **Testes Unitários/API** | Jest + Supertest | `30.5.2` / `7.3.1` | Execução de testes de integração e asserções HTTP |
| **Esteira de CI/CD** | GitHub Actions | Ubuntu Latest | Automação de testes em PRs e deploy contínuo na main |
| **Segurança Estática** | Git Hooks (Shell) | POSIX | Barreira pré-commit contra vazamento de credenciais |
| **APIs de Cotações** | Brapi, AwesomeAPI | REST | Integrações de mercado para B3, moedas fiat e cripto |
| **Orquestrador de IA** | Gemini 2.5 + Notion | SDK 0.8.3 / v2.5 | Automação autônoma de especificações e tarefas do time |

---

## 5. Padrões de Projeto e Arquitetura de Software

1. **Shared-Nothing Stateless Architecture:**  
   O backend não armazena nenhuma sessão ou estado em memória local. Toda requisição é auto-contida, permitindo escala horizontal instantânea entre instâncias serverless.
2. **Tracer Bullet Pattern:**  
   Em vez de implementar toda a modelagem de dados e endpoints no escuro, construiu-se uma fatia vertical completa (Git -> CI -> Testes -> CD -> Vercel -> Health Check -> Produção ativa). Com a esteira comprovada, novos módulos de negócio são plugados com risco de infraestrutura zero.
3. **Database-Driven Authorization (Defense in Depth):**  
   A segurança da aplicação não confia unicamente na camada de aplicação. Mesmo em cenários onde endpoints públicos são expostos, o motor de RLS do PostgreSQL assegura a privacidade dos registros de cada usuário.

---

## 6. Plano de Evolução Técnica & Recomendações

Para a evolução das próximas sprints do MVP, o time de engenharia deve executar:

1. **Sanitização do Gateway Express (P0):**
   * Readicionar o middleware `express.json()` para suporte a requisições com payload.
   * Instalar e configurar o pacote `cors`, consumindo a variável `process.env.CORS_ALLOWED_ORIGINS`.
2. **Evolução do Schema de Dados (P0 — Tarefa `E02.T01`):**
   * Criar migration para `categories` e `transactions` com foreign keys para `public.users(id)`.
   * Implementar políticas de acesso RLS (`SEC-02`) para permitir que usuários autenticados façam CRUD exclusivo de suas transações.
3. **Formalização da Decisão Node vs Python:**
   * Atualizar o `docs/architecture-spec.md` para consolidar o Node.js como o backend do MVP ou explicitar o modelo híbrido (Node.js como BFF/Gateway e workers Python isolados caso necessário no futuro).

---

*Documento formal gerado e revisado pelo Document Generator (16.45).*
