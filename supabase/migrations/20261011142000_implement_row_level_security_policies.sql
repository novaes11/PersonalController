-- ============================================================
-- SEC-02 — Implementar Políticas de Row Level Security (RLS)
-- ============================================================
-- Objetivo:
--   * Prevenir vulnerabilidades de autorização e IDOR (Insecure Direct Object References).
--   * Garantir isolamento estrito entre usuários: cada usuário acessa
--     exclusivamente seus próprios registros em `users`, `categories` e `transactions`.
--   * Permitir leitura das categorias padrão do sistema (`user_id IS NULL`)
--     por qualquer usuário autenticado.
--   * Performance: Utiliza `(SELECT auth.uid())` para avaliação em initPlan única,
--     evitando reavaliações repetidas de STABLE function por linha.
-- ============================================================

-- ------------------------------------------------------------
-- 1. POLICIES PARA `public.users`
-- ------------------------------------------------------------
-- Garantir que RLS está habilitado
alter table public.users enable row level security;

-- Leitura: usuário autenticado só visualiza seu próprio perfil
create policy "users_select_own_profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Inserção: usuário autenticado só insere seu próprio perfil
create policy "users_insert_own_profile"
  on public.users
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Atualização: usuário autenticado só atualiza seu próprio perfil
create policy "users_update_own_profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Exclusão: usuário autenticado só pode deletar seu próprio perfil
create policy "users_delete_own_profile"
  on public.users
  for delete
  to authenticated
  using ((select auth.uid()) = id);


-- ------------------------------------------------------------
-- 2. POLICIES PARA `public.categories`
-- ------------------------------------------------------------
-- Garantir que RLS está habilitado
alter table public.categories enable row level security;

-- Leitura: usuário autenticado ou anônimo visualiza categorias do sistema (globais) OU suas próprias
create policy "categories_select_system_or_own"
  on public.categories
  for select
  to authenticated, anon
  using (user_id is null or (select auth.uid()) = user_id);

-- Inserção: usuário autenticado só cria categorias associadas ao seu user_id
create policy "categories_insert_own"
  on public.categories
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Atualização: usuário só pode atualizar suas próprias categorias (não as do sistema)
create policy "categories_update_own"
  on public.categories
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Exclusão: usuário só pode excluir suas próprias categorias (não as do sistema)
create policy "categories_delete_own"
  on public.categories
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3. POLICIES PARA `public.transactions`
-- ------------------------------------------------------------
-- Garantir que RLS está habilitado
alter table public.transactions enable row level security;

-- Leitura: usuário autenticado só visualiza suas próprias transações
create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Inserção: usuário autenticado só cria transações para si mesmo
create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Atualização: usuário autenticado só atualiza suas próprias transações
create policy "transactions_update_own"
  on public.transactions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Exclusão: usuário autenticado só exclui suas próprias transações
create policy "transactions_delete_own"
  on public.transactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 4. HARDENING DE SEGURANÇA ADICIONAL (Linter Advisor Fix)
-- ------------------------------------------------------------
-- Revoga execução pública da função de trigger interno do Postgres
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
