# Especificação MVP: App de Finanças Pessoais

## 1. Arquitetura Técnica e Stack (Visão do Tech Lead)

Para garantir velocidade no desenvolvimento do MVP e manter a escalabilidade (separação de domínios), adotaremos uma arquitetura de **Microsserviços Baseados em Eventos** (ou um Monolito Modular bem definido).

### Stack Tecnológica
*   **Frontend:** React (Vite) + Tailwind CSS + Zustand (estado global) + React Query (cache de APIs).
*   **Backend Core (Finanças):** Python (FastAPI). Escolhido pela alta performance com dados e integração nativa com o ecossistema de IA/LLMs.
*   **Backend Worker (E-mails & IA):** Python (FastAPI + Celery/Redis).
*   **Banco de Dados Relacional:** PostgreSQL (hospedado na nuvem, ex: Supabase ou Neon).
*   **Mensageria:** Redis Pub/Sub ou RabbitMQ (para desacoplamento entre módulos).

### Estrutura de Pastas (Monorepo - Backend)
```text
/backend
 ├── /core_finance_service     # Domínio de transações e portfólio
 │    ├── /api
 │    ├── /models
 │    └── /services
 ├── /email_intelligence_worker # Serviço experimental (isolado)
 │    ├── /llm_agents
 │    ├── /gmail_client
 │    └── /webhook_sender
 ├── /shared_libs
 └── docker-compose.yml
```

### Modelo de Dados Essencial (PostgreSQL)

```sql
-- Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Categorias
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('INCOME', 'EXPENSE', 'INVESTMENT'))
);

-- Ativos (Assets)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(20) NOT NULL, -- Ex: AAPL, PETR4.SA, USD/BRL
    asset_type VARCHAR(50),      -- STOCK, CRYPTO, CURRENCY
    current_price DECIMAL(15,4)
);

-- Transações
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    is_automated BOOLEAN DEFAULT FALSE -- Flag para identificar se veio do LLM/Gmail
);
```

### Integrações de APIs Externas
*   **Cotações de Moedas e Ações B3:** `HG Brasil API` (fácil implementação para BRL, CDI, Selic) ou `Yahoo Finance (yfinance)` no backend Python.
*   **Mercado Americano / Cripto:** `Alpha Vantage` ou `Finnhub`.

### Isolamento do Módulo Experimental (E-mails)
O módulo de leitura de e-mails via API do Gmail e RAG/LLM será um **worker assíncrono independente**.
*   **Fluxo de isolamento:** O `email_intelligence_worker` escuta a caixa de entrada, processa o conteúdo via LLM e envia um payload de "Proposta de Transação" (via HTTP Webhook interno ou fila RabbitMQ) para o `core_finance_service`. O Core valida o payload e insere no banco com `is_automated = TRUE`, aguardando confirmação do usuário (draft). Se o módulo de IA falhar, o Core financeiro continua operando 100%.

---

## 2. Interface e Experiência do Usuário (Visão do UX/UI Designer)

O foco é reduzir atrito cognitivo. O usuário deve olhar e saber exatamente o que fazer.

### Dashboard Principal (Acionável vs. Vaidade)
*   🚫 **Métricas de Vaidade a evitar na 1ª dobra:** Patrimônio Bruto isolado (sem contexto de dívida) e oscilação diária de ativos em centavos (causa ansiedade e não gera ação).
*   ✅ **KPIs Acionáveis na 1ª dobra:**
    1.  *Liquidez de Curto Prazo:* Saldo em conta vs. Despesas fixas dos próximos 15 dias.
    2.  *Burn Rate:* "Você já gastou X% do seu orçamento mensal programado."
    3.  *Desvio de Carteira (Asset Allocation):* "Sua meta em Renda Variável é 30%, mas você está em 42%. Sugestão: Seu próximo aporte deve ser em Renda Fixa."

### Navegação Lateral (Sidebar)
A Sidebar será limpa e modularizada:
1.  **📊 Visão Geral** (Dashboard principal)
2.  **💸 Fluxo de Caixa** (Lançamentos, Orçamentos, Recorrentes)
3.  **📈 Carteira** (Posição atual, Rentabilidade, Notícias do seu portfólio)
4.  **⚙️ Configurações**
5.  *--- Divisor Visual (Área Experimental) ---*
6.  **🧠 Inbox / Produtividade** (E-mails lidos, Alertas gerados por IA, Triagem pendente).

### Fluxo de Entrada de Dados (Fricção Zero)
Input manual não pode exigir o preenchimento de 5 campos obrigatórios via dropdown.
*   **Comando Rápido:** Uma barra global (estilo Spotlight/Raycast) acessível por `Cmd/Ctrl + K`.
*   **Entrada via NLP (Natural Language Processing):** O usuário digita: *"Ifood 45 ontem"* ou *"Uber 25,50"*. O frontend envia essa string para o backend, o LLM interpreta, extrai os parâmetros (valor, categoria, data) e devolve o JSON estruturado para o modal de confirmação.

---

## 3. Inteligência e Processamento de Dados (Visão do Eng. de Dados/IA)

### Motor de Notícias e Alertas (Filtragem de Ruído)
Para não sobrecarregar o usuário com notícias macroeconômicas irrelevantes para ele:
1.  **Ingestão:** Cron job (`Celery beat`) no backend consulta RSS Feeds (ex: InfoMoney, Investing) e APIs de Notícias a cada 1-2 horas.
2.  **Filtragem de Entidades (NER):** Extraímos as tags/tickers do título/corpo da notícia (Ex: `PETR4`, `VALE3`, `IPCA`).
3.  **Match:** O sistema faz um cruzamento entre as tags da notícia e os ativos que o usuário possui na tabela `assets` do seu portfólio.
4.  **Scoring de Relevância:** Um prompt direto para um modelo rápido e barato (como Gemini 1.5 Flash ou Claude 3 Haiku) avalia: "Esta notícia indica mudança de fundamento empresarial ou é apenas ruído diário?". Apenas notícias com score alto (ex: fatos relevantes, balanços) disparam cards na interface.

### Agente de Classificação (LLM) - Fluxo de Dados
Para categorizar transações e triar e-mails, usaremos chamadas com **Structured Outputs** (JSON nativo) ao LLM.

**Exemplo do Esquema JSON exigido pelo LLM (Categorização de Despesas):**
```json
{
  "name": "transaction_classifier",
  "schema": {
    "type": "object",
    "properties": {
      "category": { 
          "type": "string", 
          "enum": ["Alimentação", "Transporte", "Moradia", "Lazer", "Investimentos", "Saúde"] 
      },
      "amount": { "type": "number" },
      "confidence_score": { "type": "number", "description": "De 0.0 a 1.0" },
      "merchant": { "type": "string" }
    },
    "required": ["category", "amount", "confidence_score", "merchant"]
  }
}
```

**Lógica de Triagem (E-mails & Despesas):**
1.  **Entrada:** Texto bruto via input rápido (NLP) ou corpo do e-mail.
2.  **Inferência:** O LLM mapeia para o JSON estrito.
3.  **Regra de Negócio Automática (Threshold):**
    *   Se `confidence_score >= 0.85`: Insere no banco silenciosamente.
    *   Se `confidence_score < 0.85`: Coloca na seção "Inbox / Produtividade" da interface pedindo revisão humana (Ex: *"Achamos que essa corrida de Uber foi Transporte, mas pode ser Trabalho. Confirma?"*).
4.  **Triagem de E-mails (Importante vs. Inútil):** Um classificador RAG preliminar analisa o e-mail: *"Isso é uma fatura/comprovante (acionável) ou é spam/newsletter?"*. Apenas e-mails "Acionáveis" passam pelo pipeline de extração JSON. O restante é descartado, economizando tokens e tempo de processamento.
