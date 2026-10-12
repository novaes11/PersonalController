-- ============================================================
-- E03.T01 — Modelar tabelas `assets` e `portfolio_positions`
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA ASSETS (Catálogo de Ativos e Cotações de Mercado)
-- ------------------------------------------------------------
create table public.assets (
  id                uuid          primary key default gen_random_uuid(),
  ticker            varchar(20)   not null,
  name              varchar(100),
  asset_type        varchar(50)   not null,
  current_price     numeric(15,4) check (current_price >= 0),
  currency          varchar(10)   not null default 'BRL',
  last_price_update timestamptz,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  constraint assets_type_check check (asset_type in ('STOCK', 'FII', 'ETF', 'CRYPTO', 'CURRENCY', 'FIXED_INCOME', 'OTHER'))
);

comment on table  public.assets                   is 'Catálogo global de ativos negociados e cotações de mercado.';
comment on column public.assets.id                is 'Identificador único UUID do ativo.';
comment on column public.assets.ticker            is 'Código de negociação do ativo (ex: PETR4, BTC, USD/BRL).';
comment on column public.assets.name              is 'Nome legível da empresa, fundo ou criptoativo.';
comment on column public.assets.asset_type        is 'Classe do ativo: STOCK, FII, ETF, CRYPTO, CURRENCY, FIXED_INCOME, OTHER.';
comment on column public.assets.current_price     is 'Última cotação/preço de mercado capturado.';
comment on column public.assets.currency          is 'Moeda base da cotação (default BRL).';
comment on column public.assets.last_price_update is 'Timestamp da última atualização de cotação.';

-- Unicidade de ticker sem diferenciar maiúsculas/minúsculas
create unique index assets_ticker_upper_idx on public.assets (upper(ticker));
create index assets_asset_type_idx on public.assets (asset_type);

-- Trigger de updated_at para assets
create trigger assets_set_updated_at
  before update on public.assets
  for each row
  execute function public.set_updated_at();

-- RLS para assets
alter table public.assets enable row level security;

create policy "assets_select_all"
  on public.assets
  for select
  to authenticated, anon
  using (true);

create policy "assets_insert_authenticated"
  on public.assets
  for insert
  to authenticated
  with check (true);


-- ------------------------------------------------------------
-- 2. TABELA PORTFOLIO_POSITIONS (Posições e Custódia do Usuário)
-- ------------------------------------------------------------
create table public.portfolio_positions (
  id            uuid          primary key default gen_random_uuid(),
  user_id       uuid          not null references public.users (id) on delete cascade,
  asset_id      uuid          not null references public.assets (id) on delete cascade,
  quantity      numeric(18,8) not null check (quantity >= 0),
  average_price numeric(15,4) not null check (average_price >= 0),
  notes         text,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  constraint portfolio_positions_user_asset_unique unique (user_id, asset_id)
);

comment on table  public.portfolio_positions               is 'Posições de investimento e custódia pertencentes ao usuário.';
comment on column public.portfolio_positions.id            is 'Identificador único da posição.';
comment on column public.portfolio_positions.user_id       is 'Usuário detentor da posição (FK public.users).';
comment on column public.portfolio_positions.asset_id      is 'Ativo sob custódia (FK public.assets).';
comment on column public.portfolio_positions.quantity      is 'Quantidade de cotas/unidades em custódia (suporta frações de cripto).';
comment on column public.portfolio_positions.average_price is 'Preço médio de aquisição por unidade.';
comment on column public.portfolio_positions.notes         is 'Anotações da posição ou corretora de custódia.';

-- Índices para portfolio_positions
create index portfolio_positions_user_id_idx on public.portfolio_positions (user_id);
create index portfolio_positions_asset_id_idx on public.portfolio_positions (asset_id);

-- Trigger de updated_at para portfolio_positions
create trigger portfolio_positions_set_updated_at
  before update on public.portfolio_positions
  for each row
  execute function public.set_updated_at();

-- RLS para portfolio_positions (isolamento estrito entre usuários)
alter table public.portfolio_positions enable row level security;

create policy "portfolio_positions_select_own"
  on public.portfolio_positions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "portfolio_positions_insert_own"
  on public.portfolio_positions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "portfolio_positions_update_own"
  on public.portfolio_positions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "portfolio_positions_delete_own"
  on public.portfolio_positions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3. SEED INICIAL DE ATIVOS POPULARES
-- ------------------------------------------------------------
insert into public.assets (ticker, name, asset_type, current_price, currency)
values
  -- Ações Brasileiras (B3)
  ('PETR4', 'Petróleo Brasileiro S.A. - Petrobras', 'STOCK', 37.50, 'BRL'),
  ('VALE3', 'Vale S.A.', 'STOCK', 62.10, 'BRL'),
  ('ITUB4', 'Itaú Unibanco Holding S.A.', 'STOCK', 34.20, 'BRL'),
  -- Fundos Imobiliários (FIIs)
  ('HGLG11', 'CSHG Logística FII', 'FII', 162.80, 'BRL'),
  ('MXRF11', 'Maxi Renda FII', 'FII', 10.15, 'BRL'),
  -- Criptoativos
  ('BTC', 'Bitcoin', 'CRYPTO', 360000.00, 'BRL'),
  ('ETH', 'Ethereum', 'CRYPTO', 14500.00, 'BRL'),
  -- Câmbio / Moedas
  ('USD/BRL', 'Dólar Americano Comercial', 'CURRENCY', 5.50, 'BRL'),
  ('EUR/BRL', 'Euro Comercial', 'CURRENCY', 6.02, 'BRL')
on conflict do nothing;
