-- ============================================================
-- E02.T01 — Modelar tabelas `categories` e `transactions`
-- ============================================================
-- Decisões de design:
--   * `categories`:
--       - `id`: UUID gerado automaticamente (`gen_random_uuid()`).
--       - `user_id`: FK para `public.users(id)` com ON DELETE CASCADE.
--         Nullable para suportar categorias padrão do sistema (user_id IS NULL)
--         e categorias customizadas do usuário (user_id NOT NULL).
--       - `type`: Restrição CHECK estrita ('INCOME', 'EXPENSE') conforme critério de aceite.
--       - `color` e `icon`: Metadados visuais para badges e gráficos no frontend.
--       - Unicidade: Evita duplicatas do mesmo nome/tipo por usuário.
--   * `transactions`:
--       - `id`: UUID gerado automaticamente (`gen_random_uuid()`).
--       - `user_id`: FK obrigatória para `public.users(id)` com ON DELETE CASCADE.
--       - `category_id`: FK para `public.categories(id)` com ON DELETE SET NULL
--         (exclusão da categoria não apaga o registro financeiro).
--       - `amount`: NUMERIC(15,2) estritamente positivo (CHECK amount > 0).
--       - `date`: Data do lançamento financeiro (default CURRENT_DATE).
--       - `description`: Detalhes / merchant da transação.
--       - `is_automated`: Flag indicando origem de IA / e-mail / OCR (default FALSE).
--   * Triggers:
--       - Reutilização da function `public.set_updated_at()` para manter `updated_at`.
--   * Índices:
--       - Otimização para queries de usuário, categorização e filtros por data.
--   * Segurança:
--       - RLS habilitado por padrão em ambas as tabelas (policies na SEC-02).
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA CATEGORIES
-- ------------------------------------------------------------
create table public.categories (
  id         uuid         primary key default gen_random_uuid(),
  user_id    uuid         references public.users (id) on delete cascade,
  name       varchar(100) not null,
  type       varchar(20)  not null,
  color      varchar(20),
  icon       varchar(50),
  created_at timestamptz  not null default now(),
  updated_at timestamptz  not null default now(),
  constraint categories_type_check check (type in ('INCOME', 'EXPENSE')),
  constraint categories_name_not_empty check (length(trim(name)) > 0)
);

comment on table  public.categories            is 'Categorias financeiras (globais ou customizadas por usuário).';
comment on column public.categories.id         is 'Identificador único UUID.';
comment on column public.categories.user_id    is 'ID do usuário proprietário (NULL se for categoria global do sistema).';
comment on column public.categories.name       is 'Nome legível da categoria (ex: Alimentação, Salário).';
comment on column public.categories.type       is 'Tipo de fluxo financeiro: INCOME ou EXPENSE.';
comment on column public.categories.color      is 'Código de cor hexadecimal ou tema para UI/gráficos.';
comment on column public.categories.icon       is 'Identificador do ícone (ex: Lucide icons).';
comment on column public.categories.updated_at is 'Atualizado automaticamente via trigger.';

-- Índices para categories
create index categories_user_id_idx on public.categories (user_id);
create unique index categories_user_name_type_unique on public.categories (
  coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name),
  type
);

-- Trigger de updated_at para categories
create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- RLS ativado (acesso negado até configuração de policies na SEC-02)
alter table public.categories enable row level security;


-- ------------------------------------------------------------
-- 2. TABELA TRANSACTIONS
-- ------------------------------------------------------------
create table public.transactions (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references public.users (id) on delete cascade,
  category_id  uuid          references public.categories (id) on delete set null,
  amount       numeric(15,2) not null,
  date         date          not null default current_date,
  description  text,
  is_automated boolean       not null default false,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now(),
  constraint transactions_amount_positive check (amount > 0)
);

comment on table  public.transactions              is 'Registros e movimentações financeiras de receitas e despesas.';
comment on column public.transactions.id           is 'Identificador único UUID.';
comment on column public.transactions.user_id      is 'Usuário proprietário da transação.';
comment on column public.transactions.category_id  is 'Categoria associada (opcional, ON DELETE SET NULL).';
comment on column public.transactions.amount       is 'Valor monetário da transação (positivo).';
comment on column public.transactions.date         is 'Data de competência da transação.';
comment on column public.transactions.description  is 'Descrição ou estabelecimento (ex: Ifood, Supermercado).';
comment on column public.transactions.is_automated is 'Indica se a transação foi importada ou gerada automaticamente por IA.';
comment on column public.transactions.updated_at   is 'Atualizado automaticamente via trigger.';

-- Índices para transactions
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_user_date_idx on public.transactions (user_id, date desc);

-- Trigger de updated_at para transactions
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

-- RLS ativado (acesso negado até configuração de policies na SEC-02)
alter table public.transactions enable row level security;


-- ------------------------------------------------------------
-- 3. CATEGORIAS PADRÃO DO SISTEMA (SEED INICIAL)
-- ------------------------------------------------------------
insert into public.categories (user_id, name, type, color, icon)
values
  -- Receitas (INCOME)
  (null, 'Salário', 'INCOME', '#10B981', 'briefcase'),
  (null, 'Renda Extra', 'INCOME', '#059669', 'plus-circle'),
  (null, 'Investimentos', 'INCOME', '#047857', 'trending-up'),
  (null, 'Outras Receitas', 'INCOME', '#6EE7B7', 'dollar-sign'),
  -- Despesas (EXPENSE)
  (null, 'Alimentação', 'EXPENSE', '#EF4444', 'utensils'),
  (null, 'Transporte', 'EXPENSE', '#F97316', 'car'),
  (null, 'Moradia', 'EXPENSE', '#F59E0B', 'home'),
  (null, 'Saúde', 'EXPENSE', '#EC4899', 'heart'),
  (null, 'Lazer', 'EXPENSE', '#8B5CF6', 'smile'),
  (null, 'Educação', 'EXPENSE', '#3B82F6', 'book-open'),
  (null, 'Outras Despesas', 'EXPENSE', '#6B7280', 'more-horizontal')
on conflict do nothing;
