# Relatório de Auditoria Arqueológica da Base de Código (Codebase Audit Report)

**Auditor:** Codebase Archaeologist (`specialized-codebase-archaeologist` — Código 16.42)  
**Data da Auditoria:** 11 de Outubro de 2026  
**Repositório Auditado:** `PersonalController` (`main` branch)  
**Status da Auditoria:** Concluída (Fase 1 do Pipeline de Documentação)  

---

## 🏺 1. Veredito Arqueológico & Sumário Executivo

A inspeção estratigráfica da base de código do **PersonalController** revela uma base construída em **quatro eras distintas**, moldadas por diferentes ferramentas e intenções de automação sem sincronização contínua de contratos.

O diagnóstico central do repositório é uma **bifurcação arquitetural fundamental**:
> **O que a documentação formal diz que o sistema é:** Um monorepo modular em Python (FastAPI + Celery/Redis) integrado a um frontend React (Vite) e banco PostgreSQL via Supabase, preparado para workers assíncronos de IA e ingestão de e-mails.  
> **O que a infraestrutura e o código realmente são:** Uma API inicial de micro-rotas em Node.js (Express 5.x) rodando em ambiente Serverless na Vercel, sem processamento em background, sem frontend instanciado, e com dependências e variáveis de ambiente órfãs.

Essa divergência não é um defeito de execução, mas o acúmulo natural de commits orientados a metas imediatas (AppSec -> CI/CD -> Serverless Vercel) sem atualização do documento mestre de arquitetura (`docs/architecture-spec.md`).

---

## 📋 2. Registro Mestre de Achados (Findings Registry)

| # | Achado (Finding) | Arquivos Envolvidos | Tipo de Drift | Severidade | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **F-01** | **Bifurcação de Stack:** Backend documentado como FastAPI/Python vs implementado em Node/Express | `docs/architecture-spec.md`, `server.js`, `package.json` | Arquitetura / Stack Drift | **Crítica** | Aberto |
| **F-02** | **Variáveis de Ambiente Órfãs:** `.env.example` e GitHub Secrets definem chaves não consumidas no código | `.env.example`, `server.js`, `package.json` | Configuração Órfã | **Alta** | Aberto |
| **F-03** | **Ausência de Middleware Essencial:** CORS não instalado/configurado apesar de variável existir | `server.js`, `package.json`, `.env.example` | Funcional / Segurança | **Alta** | Aberto |
| **F-04** | **Bloqueio Total por RLS Sem Policies:** Tabela `users` com RLS ligado e zero políticas de acesso | `supabase/migrations/20261008230000_create_users_table.sql` | Dados / Segurança | **Alta** | Aberto |
| **F-05** | **Remoção Silenciosa do Body Parser:** `express.json()` foi removido na refatoração de roteamento | `server.js` | Regressão de Código | **Média** | Aberto |
| **F-06** | **Incompatibilidade de Workers:** Celery/Redis documentado é incompatível com Vercel Serverless | `docs/architecture-spec.md`, `vercel.json` | Infraestrutura Drift | **Alta** | Aberto |
| **F-07** | **Incongruência de DDL no Modelo de Usuário:** `id` no spec gera UUID vs no SQL referencia `auth.users` | `docs/architecture-spec.md`, `supabase/migrations/*` | Schema Drift | **Média** | Aberto |
| **F-08** | **Duplicação de Catálogo de Agentes:** Coexistência de `.agents/skills` e `.squad/agents` | `.agents/skills/`, `.squad/agents/`, `.squad/squad-config.yml` | Duplicação Estrutural | **Baixa** | Aberto |
| **F-09** | **Repositório Aninhado Ignorado:** Pasta `ai-agents-core/` com seu próprio `.git` dentro do projeto | `.gitignore`, `ai-agents-core/` | Estrutura de Monorepo | **Média** | Aberto |
| **F-10** | **Metadados Obsoletos no `package.json`:** Keywords listam `fastapi` e `react` inexistentes no repo | `package.json` | Metadados Fantasmas | **Baixa** | Aberto |

---

## ⏳ 3. As Eras Estratigráficas do Repositório (Timeline & Tree Rings)

O histórico de commits permite reconstruir quatro camadas temporais claras:

```
[ Era 4: Vercel Serverless & CD ] ──> vercel.json, api/index.js, deploy.yml, rota raiz Express
               ▲
[ Era 3: Orquestração de Agentes ] ──> ai-agents-core, .squad/, workflows do Esquadrão
               ▲
[ Era 2: AppSec & Modelagem Inicial ] ──> pre-commit hook, .env.example, migration users (RLS on)
               ▲
[ Era 1: Especificação Idealizada ] ──> docs/architecture-spec.md (FastAPI, Celery, React, Docker)
```

### Era 1: A Especificação Idealizada (Fundação de Produto)
* **Padrão:** Documento concebido para arquitetura de microsserviços em containers Docker.
* **Premissas Registradas:**
  - Backend Core em Python FastAPI com Pydantic v2 estrito.
  - Workers assíncronos com Celery e Redis para leitura periódica de RSS e polling de e-mails via Gmail API.
  - Frontend SPA em React 18 com Vite, Tailwind e Zustand.
* **Marcas no Código:** Permanece intacto em `docs/architecture-spec.md`, mas **nenhum arquivo de código dessa era foi escrito**.

### Era 2: Implementação Tracer Bullet & Hardening AppSec
* **Padrão:** Foco em estabelecer um pipeline funcional mínimo e blindagem de segurança (SEC-01).
* **Decisões Adotadas:**
  - O backend nasceu como um servidor Node.js Express mínimo (`server.js`) contendo apenas `/health`.
  - Configurado pre-commit hook rigoroso para barrar commit de `.env` e chaves privadas.
  - Criação da migration `20261008230000_create_users_table.sql`, decidindo corretamente por herdar `id` de `auth.users(id)` com RLS ativado.
* **Drift Gerado:** O time começou a construir em Node.js sem atualizar a especificação que exigia Python.

### Era 3: Injeção do Esquadrão Autônomo de IA
* **Padrão:** Automação de pipelines orientada a DAGs de IA com Gemini e Notion.
* **Decisões Adotadas:**
  - Inclusão do repositório externo `ai-agents-core` (adicionado ao `.gitignore`).
  - Criação do workflow `.github/workflows/ai-review.yml`.
  - Criação do diretório `.squad/` com manifesto `squad-config.yml` contendo agentes de revisão, teste e segurança.
* **Marcas no Código:** Criou uma camada meta-operacional no repositório. O Esquadrão foi configurado para resolver issues/PRs, mas gerou acoplamento com o modelo do Notion e cotas do Gemini.

### Era 4: Pivot para Serverless e Continuous Deployment (Atual)
* **Padrão:** Custo $0/mês e deploy contínuo desacoplado via Vercel e GitHub Actions.
* **Decisões Adotadas:**
  - Criação de `api/index.js` e `vercel.json` com regras de rewrite para Express serverless.
  - Criação de `.github/workflows/deploy.yml` integrado ao GitHub Environment `production`.
  - Normalização de rotas no Express para interceptar paths gerados pelo proxy da Vercel (`/api/index.js`).
* **Estado Atual:** A API está em produção na Vercel respondendo 200 OK, consolidando o Node.js como backend de fato da infraestrutura atual.

---

## 🔍 4. Detalhamento dos Desvios e Riscos (Deep-Dive)

### 4.1. Divergência Crítica: Backend Node.js vs Python FastAPI
* **Evidência:** `docs/architecture-spec.md` (Linhas 8-10):
  ```markdown
  * **Backend Core (Finanças):** Python (FastAPI).
  * **Backend Worker (E-mails & IA):** Python (FastAPI + Celery/Redis).
  ```
  `package.json` / `server.js`:
  ```json
  "dependencies": { "express": "^5.2.1" }
  ```
* **Impacto:** Qualquer desenvolvedor ou novo agente que consultar `docs/architecture-spec.md` tentará escrever código em Python, criar endpoints FastAPI ou rodar Celery, colidindo com a esteira de CD existente que executa `npm test` e deploy Node.js na Vercel.
* **Decisão Necessária:** Ou oficializar o backend em **Node.js/Express (ou TypeScript/Nest/Fastify)** e atualizar a documentação, ou tratar o `server.js` apenas como um proxy/BFF provisório e criar a pasta `/backend` em Python.

### 4.2. Variáveis de Ambiente Fantasmas e Falta de CORS
* **Evidência:** O arquivo `.env.example` lista:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `BRAPI_TOKEN`, `APP_ENV`, `CORS_ALLOWED_ORIGINS`.
* **Código Real:** O arquivo `server.js` lê exclusivamente `process.env.PORT`. Nenhuma das variáveis do Supabase ou de CORS é importada.
* **Falta do Pacote CORS:** O pacote `cors` não consta em `package.json`. Quando o frontend for conectado, todas as requisições disparadas pelo navegador para `https://personalcontroller.vercel.app` falharão por bloqueio de política de CORS do navegador.

### 4.3. Bloqueio no Banco de Dados (Supabase RLS Sem Políticas)
* **Evidência:** Migration `20261008230000_create_users_table.sql` (Linha 47):
  ```sql
  alter table public.users enable row level security;
  ```
* **Impacto:** O RLS foi ativado por padrão (excelente para segurança), mas nenhuma política (`CREATE POLICY`) foi criada. Na prática, nenhuma leitura ou escrita via API (chave `anon` ou `authenticated`) funcionará nesta tabela até que a tarefa **SEC-02** seja implementada.

### 4.4. Regressão Silenciosa no `server.js` (Body Parser Removido)
* **Evidência:** Na primeira versão do servidor, constava `app.use(express.json())`. Durante as alterações de roteamento serverless, essa linha foi suprimida.
* **Impacto:** Endpoints do tipo `POST` ou `PUT` que receberem payloads JSON em requisições futuras receberão `req.body` como `undefined`, gerando quebras imediatas em formulários.

---

## 🛠️ 5. Matriz de Priorização de Refatoração

```
URGÊNCIA vs IMPACTO:
┌──────────────────────────────────────────┬──────────────────────────────────────────┐
│ ALTO IMPACTO / ALTA URGÊNCIA (P0)         │ ALTO IMPACTO / MÉDIA URGÊNCIA (P1)       │
│ • Restaurar express.json() em server.js  │ • Oficializar decisão Node vs Python no  │
│ • Instalar e configurar middleware cors  │   architecture-spec.md                   │
│ • Criar políticas RLS básicas (SEC-02)   │ • Migrar server.js para TypeScript/ESM   │
├──────────────────────────────────────────┼──────────────────────────────────────────┤
│ BAIXO IMPACTO / ALTA URGÊNCIA (P2)       │ BAIXO IMPACTO / BAIXA URGÊNCIA (P3)      │
│ • Remover keywords fantasmas no          │ • Unificar diretórios .agents e .squad   │
│   package.json                           │ • Adicionar script build em package.json │
└──────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 🎯 6. Arquivos que Exigem Ação Imediata

1. **[`server.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/server.js):**
   - Readicionar `app.use(express.json())`.
   - Adicionar suporte a `cors` com leitura de `process.env.CORS_ALLOWED_ORIGINS`.
   - Adicionar middleware genérico de tratamento de erros 404 e 500.
2. **[`package.json`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/package.json):**
   - Instalar `cors` e `dotenv` em `dependencies`.
   - Limpar keywords incompatíveis com a stack real.
3. **[`docs/architecture-spec.md`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/docs/architecture-spec.md):**
   - Atualizar a seção de Stack Técnica para refletir o backend serverless e a hospedagem na Vercel, documentando a transição de arquitetura.

---

*Relatório gerado pelo Codebase Archaeologist em conformidade com as diretrizes da Fase 1 da Orquestração.*
