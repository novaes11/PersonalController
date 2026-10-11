# Guia de Onboarding Técnico do Desenvolvedor (Developer Onboarding Guide)

**Auditor/Autor:** Codebase Onboarding Engineer (`engineering-codebase-onboarding-engineer` — Código 3.10)  
**Projeto:** PersonalController 📊💰  
**Classificação:** Guia Prático para Engenheiros Recém-Chegados (Fase 3 do Pipeline)  
**Versão:** 1.0.0  
**Data:** 11 de Outubro de 2026  

---

## 🧭 1. Resumo em Uma Linha (1-Line Summary)

O **PersonalController** é uma API serverless em Node.js (Express 5.x) integrada ao Supabase (PostgreSQL 17) para gestão financeira e portfólio de investimentos, operando com deploy contínuo na Vercel e custo zero de infraestrutura.

---

## ⚡ 2. Visão Rápida em 5 Minutos (5-Minute Mental Model)

* **O que o código faz hoje:** Atua como o API Gateway do sistema, fornecendo verificação de integridade operacional (*health check*), roteamento dual (local e serverless na nuvem) e baseline de dados para autenticação e perfis de usuário.
* **Entradas principais (Inputs):** Requisições HTTP REST (`GET /`, `GET /health`, `GET /api/health`).
* **Saídas principais (Outputs):** Respostas em JSON com status do serviço, timestamp ISO e cabeçalhos de segurança.
* **Arquivos-chave que você precisa conhecer:**
  * [`server.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/server.js): Coração da aplicação Express e roteador principal.
  * [`api/index.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/api/index.js): Ponto de entrada (handler) exigido pela Vercel para execução serverless.
  * [`vercel.json`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/vercel.json): Configuração do proxy reverso de produção.
  * [`server.test.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/server.test.js): Bateria de testes de integração com Jest e Supertest.
  * [`supabase/migrations/`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/supabase/migrations/): DDLs e versionamento do banco de dados relacional.
* **Fluxo de execução primário:**
  $$\text{Requisição HTTP} \longrightarrow \text{Proxy Vercel (ou porta local)} \longrightarrow \text{Normalização de Path} \longrightarrow \text{Roteador Express} \longrightarrow \text{JSON Response}$$

---

## 🛠️ 3. Passo a Passo: Rodando o Projeto Localmente

Siga estritamente os passos abaixo para configurar seu ambiente de desenvolvimento.

### Pré-requisitos
* **Node.js:** Versão `20.x` ou `24.x LTS` instalada (`node -v`).
* **NPM:** Versão `10.x` ou superior (`npm -v`).
* **Git:** Instalado e configurado com chave SSH ou token de acesso.

---

### Passo 1: Clonar o Repositório
```bash
git clone git@github.com:novaes11/PersonalController.git
cd PersonalController
```

---

### Passo 2: Ativar o Hook de Segurança (OBRIGATÓRIO)
> 🚨 **Atenção:** O repositório utiliza uma trava pré-commit para impedir que você commite acidentalmente tokens, senhas ou arquivos `.env`. Ative o hook executando:

```bash
git config core.hooksPath .githooks
```
*(Se você tentar fazer um commit contendo strings de chave privada ou arquivos de ambiente staged, o commit será abortado imediatamente).*

---

### Passo 3: Configurar Variáveis de Ambiente
Copie o template oficial para criar seu arquivo local:

```bash
cp .env.example .env
```

Abra o arquivo `.env` gerado. Para execução local do servidor atual, os valores padrão são:
```env
# Porta do servidor local
PORT=3000

# Ambiente de execução
APP_ENV=development

# Origens permitidas para requisições de frontend
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Credenciais do Supabase (para futuras chamadas de banco)
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_ANON_KEY=<sua-chave-anon-aqui>
SUPABASE_SERVICE_ROLE_KEY=<sua-chave-service-role-aqui>
SUPABASE_JWT_SECRET=<seu-jwt-secret-aqui>
```
> ⚠️ **Regra de Ouro:** Nunca adicione o arquivo `.env` ao Git. Ele já está protegido pelo `.gitignore` e pelo pre-commit hook.

---

### Passo 4: Instalar as Dependências
Instale os pacotes definidos no `package.json` utilizando o lockfile para garantir paridade exata:

```bash
npm install
# ou para instalação limpa de CI:
npm ci
```

---

### Passo 5: Iniciar o Servidor Local
```bash
npm start
```
Você verá a saída no console:
```text
Server is running on port 3000
```

---

### Passo 6: Validar os Endpoints no Navegador ou Terminal
Com o servidor rodando, teste os endpoints ativos:

1. **Endpoint Raiz:**
   ```bash
   curl http://localhost:3000/
   # Resposta esperada:
   # {"status":"ok","service":"PersonalController API","timestamp":"..."}
   ```

2. **Endpoint de Health Check:**
   ```bash
   curl http://localhost:3000/health
   # Resposta esperada:
   # {"status":"ok","pipeline":"running"}
   ```

---

## 🧪 4. Como Rodar e Criar Testes Automatizados

O projeto utiliza **Jest** como runner de asserções e **Supertest** para simular chamadas HTTP contra a instância do Express sem precisar subir portas de rede reais.

### Executar a Suíte de Testes
```bash
npm test
```

### O Que os Testes Cobrem Atualmente
O arquivo [`server.test.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/server.test.js) valida 5 cenários críticos:
1. `GET /health` direto no objeto `app`.
2. `GET /health` passando pelo handler serverless (`apiHandler`).
3. `GET /api/health` para garantir paridade com proxies reversos.
4. `GET /api/index.js/health` validando a normalização de rewrite da Vercel.
5. `GET /` validando o payload de identificação da API.

### Como Escrever um Novo Teste
Sempre que você criar um novo endpoint, adicione seu caso de teste em `server.test.js`:
```javascript
describe('GET /meu-novo-endpoint', () => {
  it('deve retornar status 200 e dados corretos', async () => {
    const response = await request(app).get('/meu-novo-endpoint');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('sua_propriedade');
  });
});
```

---

## 🧠 5. Controladores e Fluxos Arquiteturais que Você Deve Entender Primeiro

Como novo desenvolvedor no time, estes são os três fluxos fundamentais do sistema:

### Fluxo 1: Dualidade de Execução (Local vs Serverless na Nuvem)
* **Localmente:** Quando você roda `node server.js`, a condição `if (require.main === module)` é verdadeira. O Express vincula a porta (`app.listen(PORT)`).
* **Na Vercel:** A Vercel **não** roda `app.listen()`. Ela importa o handler através de [`api/index.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/api/index.js), que reexporta o `app`.
* **A Mágica da Normalização:** A Vercel reescreve requisições com o path físico do arquivo serverless (`/api/index.js/health`). No [`server.js`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/server.js), o middleware:
  ```javascript
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/index.js')) {
      req.url = req.url.replace('/api/index.js', '') || '/';
    }
    next();
  });
  ```
  remove silenciosamente o prefixo e entrega a rota limpa para o `router.get('/health')`.

---

### Fluxo 2: Camada de Dados (PostgreSQL no Supabase)
* O banco de dados relacional é versionado via SQL migrations em [`supabase/migrations/`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/supabase/migrations/).
* **Tabela de Usuários Atual:** [`20261008230000_create_users_table.sql`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/supabase/migrations/20261008230000_create_users_table.sql) cria a tabela `public.users`.
* **Ponto Crítico de Atenção:** A tabela `public.users` não possui IDs aleatórios; seu `id` é uma chave estrangeira direta para `auth.users(id)` do Supabase Auth.
* **Segurança:** O Row Level Security (RLS) está ligado por padrão (`ENABLE ROW LEVEL SECURITY`). As queries exigirão autenticação válida com JWT para retornar dados.

---

### Fluxo 3: Ciclo de Desenvolvimento e Deploy (Git & GitHub Actions)
1. **Criando Features:** Sempre crie uma branch a partir da `main`:
   ```bash
   git checkout -b feat/nome-da-sua-tarefa
   ```
2. **Abrindo Pull Requests:**
   * Quando o PR é aberto, a esteira [`.github/workflows/ci.yml`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/.github/workflows/ci.yml) executa `npm ci` e `npm test`.
   * A Vercel gera automaticamente um **Preview Deployment** com uma URL temporária exclusiva para você testar suas alterações.
   * O **AI Squad Orchestrator** lê a tarefa vinculada no Notion e valida o PR.
3. **Merge para Produção:**
   * Ao fazer o merge do PR para a branch `main`, a esteira [`.github/workflows/deploy.yml`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/.github/workflows/deploy.yml) é acionada.
   * Ela roda os testes unitários, faz o build de produção e publica automaticamente na URL oficial:  
     👉 **`https://personalcontroller.vercel.app`**

---

## 🚀 6. Próximo Passo do Desenvolvedor

Agora que seu ambiente está configurado e você compreende o funcionamento do projeto, sua próxima atribuição de desenvolvimento é a tarefa:

📌 **`[P0] E02.T01` — Modelar tabelas `categories` e `transactions` no Supabase**  
* Local: Criar nova migration em `supabase/migrations/`.  
* Objetivo: Estruturar as tabelas financeiras com constraints e relacionamentos com `public.users`.

Seja muito bem-vindo ao time de engenharia do **PersonalController**! 🤝
