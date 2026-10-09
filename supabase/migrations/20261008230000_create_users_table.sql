-- ============================================================
-- E01.T01 — Modelar tabela `users`
-- ============================================================
-- Decisão de design:
--   * Credenciais (senha/hash) vivem em `auth.users`, gerenciado pelo
--     Supabase Auth. Esta tabela é o PERFIL da aplicação, 1:1 com ela.
--   * `id` NÃO gera UUID próprio: herda o id de `auth.users`, o que
--     permite policies RLS simples (`auth.uid() = id`) na SEC-02.
--   * ON DELETE CASCADE: remover o usuário do Auth remove o perfil.
-- ============================================================

create table public.users (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_format check (position('@' in email) > 1)
);

comment on table  public.users            is 'Perfil da aplicação, 1:1 com auth.users (Supabase Auth).';
comment on column public.users.id         is 'Mesmo UUID de auth.users.id.';
comment on column public.users.email      is 'E-mail do usuário (unicidade case-insensitive).';
comment on column public.users.updated_at is 'Atualizado automaticamente via trigger.';

-- Unicidade de e-mail sem diferenciar maiúsculas/minúsculas
create unique index users_email_lower_key on public.users (lower(email));

-- Trigger genérico de updated_at (reutilizável pelas próximas tabelas)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- Segurança por padrão: RLS ligado e SEM policies = acesso negado para
-- anon/authenticated via API. As policies de acesso entram na SEC-02.
alter table public.users enable row level security;
