# 📐 Especificação Arquitetural e Diagramas UML (Padrão MVC)

> **Documento:** Especificação Técnica de Engenharia de Software  
> **Sistema:** PersonalController (Gestor Financeiro Pessoal & Consolidação de Portfólio)  
> **Padrão Arquitetural:** Model-View-Controller (MVC) com Backend Serverless e Banco Relacional com RLS  
> **Versão:** 1.0.0  
> **Data:** 13 de Outubro de 2026  

---

## 🏛️ 1. Mapeamento do Padrão MVC no PersonalController

O **PersonalController** implementa a separação de responsabilidades fundamentada no padrão clássico **Model-View-Controller (MVC)**, adaptado para uma arquitetura orientada a APIs REST e Single-Page Application (SPA):

```mermaid
flowchart LR
    subgraph VIEW["🖥️ VIEW (Apresentação & Consumo)"]
        SPA["Frontend SPA (React / Vite)"]
        JSON_RES["JSON Serializer / Response Envelope"]
    end

    subgraph CONTROLLER["⚙️ CONTROLLER (Orquestração & Fluxo)"]
        ROUTES["Express Routers (/routes)"]
        AUTH_MID["Middlewares (requireAuth, requireRole)"]
        CTRL["Express Controllers (/controllers)"]
    end

    subgraph MODEL["📦 MODEL (Domínio, Validação & Persistência)"]
        SCHEMAS["Zod Schemas (/schemas - Validação Estrita)"]
        CLIENT["Supabase Client (/lib/supabase)"]
        DB[(PostgreSQL 17 + Row Level Security)]
    end

    SPA -->|1. Envia Requisição HTTP + JWT| ROUTES
    ROUTES -->|2. Intercepta e Autentica| AUTH_MID
    AUTH_MID -->|3. Encaminha Requisição Válida| CTRL
    CTRL -->|4. Valida Payload de Entrada| SCHEMAS
    CTRL -->|5. Executa Regra de Negócio & Query| CLIENT
    CLIENT -->|6. Aplica Políticas RLS & Persiste| DB
    DB -->>|7. Retorna Dados Filtrados| CLIENT
    CLIENT -->>|8. Entrega Entidade de Domínio| CTRL
    CTRL -->|9. Formata Resposta JSON| JSON_RES
    JSON_RES -->>|10. Renderiza Interface| SPA
```

### Divisão de Responsabilidades:

1. **Model (Domínio e Dados):**
   - **Contratos e Validações:** Localizados em `src/schemas/`, definem a integridade dos dados via Zod (`auth.schema.js`, `transactions.schema.js`, `categories.schema.js`), bloqueando tipos inválidos e *mass assignment*.
   - **Acesso a Dados e Persistência:** Gerenciado via `src/lib/supabase.js` e tabelas no PostgreSQL (`users`, `categories`, `transactions`, `assets`, `portfolio_positions`).
   - **Regras de Isolamento de Dados:** Asseguradas no próprio banco através de *Row Level Security (RLS)* via `auth.uid() = user_id`.

2. **Controller (Controle e Coordenação):**
   - **Roteamento e Filtros de Entrada:** Localizados em `src/routes/`, mapeiam os verbos HTTP (`GET`, `POST`, `PUT`, `DELETE`).
   - **Interceptadores / Middlewares:** `src/middlewares/auth.middleware.js` valida assinaturas de JWT, papéis de acesso (RBAC) e bloqueia requisições sem credenciais.
   - **Lógica de Aplicação:** Localizada em `src/controllers/`, orquestra a validação dos Schemas do Model, injeta o identificador do usuário autenticado (`req.user.id`) para prevenir spoofing (AuthZ) e despacha o status HTTP correto (200, 201, 400, 401, 403, 404, 500).

3. **View (Apresentação e Formatação):**
   - **Frontend SPA (Cliente):** Interface interativa em React/Tailwind responsável por interagir com o usuário e disparar requisições.
   - **Envelopes de Resposta REST:** Padronização estruturada de respostas JSON (`{ status: 'ok', data: ..., count: ... }` ou `{ status: 'error', message: ..., errors: [...] }`), garantindo previsibilidade para a camada cliente.

---

## 📊 2. Diagrama de Classes UML (Camadas Controller e Model)

O diagrama a seguir especifica as classes e módulos principais do backend, demonstrando atributos, métodos públicos e relacionamentos de dependência e agregação:

```mermaid
classDiagram
    %% Camada de Controle
    class AuthMiddleware {
        +requireAuth(req, res, next) Promise~void~
        +requireRole(roles) Function
        +optionalAuth(req, res, next) Promise~void~
    }

    class AuthController {
        +signup(req, res) Promise~Response~
        +login(req, res) Promise~Response~
        +logout(req, res) Promise~Response~
        +getMe(req, res) Promise~Response~
    }

    class TransactionsController {
        +listTransactions(req, res) Promise~Response~
        +getTransactionById(req, res) Promise~Response~
        +createTransaction(req, res) Promise~Response~
        +updateTransaction(req, res) Promise~Response~
        +deleteTransaction(req, res) Promise~Response~
    }

    class CategoriesController {
        +listCategories(req, res) Promise~Response~
        +getCategoryById(req, res) Promise~Response~
        +createCategory(req, res) Promise~Response~
        +updateCategory(req, res) Promise~Response~
        +deleteCategory(req, res) Promise~Response~
    }

    %% Camada de Model / Schemas
    class AuthSchema {
        +signupSchema ZodObject
        +loginSchema ZodObject
    }

    class TransactionSchema {
        +createTransactionSchema ZodObject
        +updateTransactionSchema ZodObject
    }

    class CategorySchema {
        +createCategorySchema ZodObject
        +updateCategorySchema ZodObject
    }

    %% Entidades de Banco de Dados (Model Persistente)
    class User {
        +UUID id
        +String email
        +DateTime created_at
    }

    class Category {
        +UUID id
        +String name
        +CategoryType type
        +String color
        +String icon
        +UUID user_id
        +DateTime created_at
    }

    class Transaction {
        +UUID id
        +UUID user_id
        +UUID category_id
        +Decimal amount
        +Date date
        +String description
        +Boolean is_automated
        +DateTime created_at
    }

    class Asset {
        +UUID id
        +String ticker
        +String name
        +AssetType asset_type
        +Decimal current_price
        +DateTime last_price_update
    }

    class PortfolioPosition {
        +UUID id
        +UUID user_id
        +UUID asset_id
        +Decimal quantity
        +Decimal average_price
        +DateTime updated_at
    }

    class CategoryType {
        <<enumeration>>
        INCOME
        EXPENSE
    }

    class AssetType {
        <<enumeration>>
        STOCK
        FII
        CRYPTO
        FIXED_INCOME
    }

    %% Relacionamentos do MVC
    TransactionsController ..> AuthMiddleware : protegido por
    CategoriesController ..> AuthMiddleware : protegido por
    AuthController ..> AuthSchema : valida com
    TransactionsController ..> TransactionSchema : valida com
    CategoriesController ..> CategorySchema : valida com

    TransactionsController --> Transaction : opera
    CategoriesController --> Category : opera
    AuthController --> User : autentica e sincroniza

    User "1" --> "0..*" Transaction : possui
    User "1" --> "0..*" Category : customiza
    User "1" --> "0..*" PortfolioPosition : detém
    Category "1" --> "0..*" Transaction : categoriza
    Asset "1" --> "0..*" PortfolioPosition : referencia
    Category ..> CategoryType : utiliza
    Asset ..> AssetType : utiliza
```

---

## 🔄 3. Diagrama de Sequência UML (Fluxo MVC da Requisição)

O diagrama de sequência a seguir exemplifica o ciclo de vida completo de uma requisição de negócio: **Criação de Transação (`POST /transactions`) com Validação de Entrada, AuthZ e Isolamento de Dados**:

```mermaid
sequenceDiagram
    autonumber
    actor UserClient as View: Frontend (Cliente)
    participant Router as Controller: Express Router
    participant Auth as Controller: AuthMiddleware
    participant Ctrl as Controller: TransactionsController
    participant ModelSchema as Model: TransactionsSchema (Zod)
    participant Supabase as Model: SupabaseClient
    participant Postgres as Model: PostgreSQL (Tabela + RLS)

    UserClient->>Router: POST /transactions [Header: Bearer <JWT>, Body: JSON]
    Router->>Auth: requireAuth(req, res, next)
    
    alt Token ausente ou formato inválido
        Auth-->>UserClient: 401 Unauthorized ("Token ausente ou inválido")
    else Token presente
        Auth->>Supabase: supabase.auth.getUser(jwt)
        alt Token expirado ou assinatura inválida
            Supabase-->>Auth: Error: Invalid token
            Auth-->>UserClient: 401 Unauthorized ("Sessão expirada")
        else Token válido
            Supabase-->>Auth: Retorna user ({ id, email })
            Auth->>Auth: Injeta req.user e req.userId
            Auth->>Ctrl: next() -> createTransaction(req, res)
        end
    end

    Ctrl->>ModelSchema: createTransactionSchema.safeParse(req.body)
    alt Payload inválido (amount negativo, data malformada, etc.)
        ModelSchema-->>Ctrl: validation.success = false
        Ctrl-->>UserClient: 400 Bad Request ({ status: 'error', errors: [...] })
    else Payload válido
        ModelSchema-->>Ctrl: validation.data
        Ctrl->>Ctrl: AuthZ Anti-Spoofing: payload.user_id = req.user.id
        Ctrl->>Supabase: supabase.from('transactions').insert([payload])
        Supabase->>Postgres: INSERT INTO public.transactions ... (com JWT header)
        Postgres->>Postgres: Avalia RLS: CHECK (auth.uid() = user_id)
        Postgres-->>Supabase: Retorna novo registro criado
        Supabase-->>Ctrl: { data: transaction, error: null }
        Ctrl-->>UserClient: 201 Created ({ status: 'ok', data: transaction })
    end
```

---

## 🎯 4. Diagrama de Casos de Uso UML

Mapeamento dos atores do sistema e das suas fronteiras funcionais nas camadas de apresentação e controle:

```mermaid
flowchart TD
    subgraph ATORES["👥 Atores"]
        ANON["Usuário Anônimo"]
        AUTH_USER["Usuário Autenticado"]
        CRON["Sistema / Cron Worker"]
        ADMIN["Administrador"]
    end

    subgraph UC_AUTH["Módulo de Autenticação"]
        UC1["Cadastrar Conta (POST /auth/signup)"]
        UC2["Autenticar Sessão (POST /auth/login)"]
        UC3["Consultar Perfil (GET /auth/me)"]
        UC4["Encerrar Sessão (POST /auth/logout)"]
    end

    subgraph UC_FIN["Módulo Financeiro (Transações e Categorias)"]
        UC5["Listar Transações com Filtros (GET /transactions)"]
        UC6["Lançar Nova Transação (POST /transactions)"]
        UC7["Editar Transação Própria (PUT /transactions/:id)"]
        UC8["Excluir Transação Própria (DELETE /transactions/:id)"]
        UC9["Listar Categorias Disponíveis (GET /categories)"]
        UC10["Criar Categoria Customizada (POST /categories)"]
    end

    subgraph UC_PORT["Módulo de Portfólio & Mercado"]
        UC11["Visualizar Posição Consolidada (GET /portfolio/consolidated)"]
        UC12["Atualizar Cotações de Mercado (Cron Job / Worker)"]
    end

    ANON --> UC1
    ANON --> UC2

    AUTH_USER --> UC3
    AUTH_USER --> UC4
    AUTH_USER --> UC5
    AUTH_USER --> UC6
    AUTH_USER --> UC7
    AUTH_USER --> UC8
    AUTH_USER --> UC9
    AUTH_USER --> UC10
    AUTH_USER --> UC11

    CRON --> UC12
    ADMIN --> UC9
```

---

## 🗄️ 5. Diagrama de Entidade-Relacionamento UML (Modelo de Dados)

O diagrama ER abaixo representa o **Model Relacional** persistido no PostgreSQL 17 do Supabase:

```mermaid
erDiagram
    USERS {
        uuid id PK "auth.users FK (1:1)"
        varchar email "Unique, Not Null"
        timestamp created_at "Default now()"
    }

    CATEGORIES {
        uuid id PK "Default gen_random_uuid()"
        varchar name "Not Null"
        varchar type "INCOME ou EXPENSE"
        varchar color "Hex code (#RRGGBB)"
        varchar icon "Nome do ícone Lucide/FontAwesome"
        uuid user_id FK "Null para categorias de sistema"
        timestamp created_at "Default now()"
    }

    TRANSACTIONS {
        uuid id PK "Default gen_random_uuid()"
        uuid user_id FK "Not Null -> users.id"
        uuid category_id FK "Nullable -> categories.id"
        numeric amount "Not Null, Check (amount > 0)"
        date date "Not Null, Default CURRENT_DATE"
        text description "Nullable (max 255 chars)"
        boolean is_automated "Default false"
        timestamp created_at "Default now()"
    }

    ASSETS {
        uuid id PK "Default gen_random_uuid()"
        varchar ticker "Unique, Not Null (ex: PETR4, BTC)"
        varchar name "Not Null"
        varchar asset_type "STOCK, FII, CRYPTO, FIXED_INCOME"
        numeric current_price "Preço atual de mercado"
        timestamp last_price_update "Timestamp da última cotação"
        timestamp created_at "Default now()"
    }

    PORTFOLIO_POSITIONS {
        uuid id PK "Default gen_random_uuid()"
        uuid user_id FK "Not Null -> users.id"
        uuid asset_id FK "Not Null -> assets.id"
        numeric quantity "Not Null, Check (quantity >= 0)"
        numeric average_price "Preço médio de aquisição"
        timestamp updated_at "Default now()"
    }

    USERS ||--o{ TRANSACTIONS : "possui"
    USERS ||--o{ CATEGORIES : "customiza"
    USERS ||--o{ PORTFOLIO_POSITIONS : "detém"
    CATEGORIES ||--o{ TRANSACTIONS : "classifica"
    ASSETS ||--o{ PORTFOLIO_POSITIONS : "compõe"
```

---

## 🔄 6. Diagrama de Estados UML (Ciclo de Vida de Transações)

Mapeamento de estados e transições no ciclo de vida de uma entidade do Model:

```mermaid
stateDiagram-v2
    [*] --> Insercao_Pendente: View envia payload via POST /transactions
    
    Insercao_Pendente --> Validacao_Falhou: Schema Zod rejeita campos inválidos
    Validacao_Falhou --> [*]: Retorna HTTP 400

    Insercao_Pendente --> Nao_Autorizado: Token JWT ausente ou expirado
    Nao_Autorizado --> [*]: Retorna HTTP 401

    Insercao_Pendente --> Persistida: Validado e injetado user_id autenticado
    Persistida --> Consolidada: Atualiza saldo e métricas da conta
    
    Consolidada --> Atualizada: View envia PUT /transactions/:id (Pertence ao user_id)
    Atualizada --> Consolidada: Recalcula totais

    Consolidada --> Excluida: View envia DELETE /transactions/:id (Pertence ao user_id)
    Excluida --> [*]: Retorna HTTP 200 (Removida da base)
```

---

## 🛡️ 7. Benefícios do Padrão MVC Adotado

1. **Baixo Acoplamento:** A View (SPA) não conhece a estrutura interna das tabelas do banco; ela interage exclusivamente com a interface JSON exposta pelos Controllers.
2. **Defesa em Profundidade:**
   - **Camada Controller:** Impede requisições não autenticadas (`requireAuth`) e força o ownership do usuário autenticado (`req.user.id`).
   - **Camada Model (Schemas):** Garante sanitização de tipos e rejeição de campos não declarados (*Mass Assignment*).
   - **Camada Model (Database):** O PostgreSQL executa políticas RLS a nível de linha, garantindo isolamento criptográfico e de sessão mesmo contra falhas na camada aplicacional.
3. **Testabilidade:** Cada camada do MVC pode ser testada de forma isolada através de suítes de testes unitários e de integração com Jest e Supertest.
