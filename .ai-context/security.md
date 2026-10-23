# Políticas de Segurança e AppSec — PersonalController

## 1. Row Level Security (RLS) no PostgreSQL

A segurança de dados do **PersonalController** é fundamentada em Row Level Security ativa no Supabase:
- Toda query às tabelas `transactions`, `categories`, `assets` e `portfolio` é filtrada pelo identificador do usuário autenticado:
  ```sql
  CREATE POLICY "Usuários acessam apenas suas próprias transações"
  ON public.transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
  ```
- **Prevenção de IDOR:** Mesmo que um usuário mal-intencionado altere o UUID na URL (`DELETE /api/transactions/:id`), a cláusula RLS garante que o banco de dados retornará 0 linhas caso o recurso pertença a outro usuário.

---

## 2. Prevenção de Mass Assignment (SEC-04)

- Todo schema Zod de inserção ou atualização possui `.strict()`.
- Campos críticos como `user_id`, `id`, `created_at` e permissões de perfil são gerenciados exclusivamente pelo servidor e jamais aceitos no corpo da requisição.

---

## 3. Rate Limiting (SEC-05)

- **Endpoints de Autenticação (`/api/auth/*`):** Limitados a 10 requisições por IP a cada 15 minutos para impedir ataques de força bruta.
- **Endpoints de API Geral (`/api/*`):** Limitados a 100 requisições por IP a cada minuto para evitar sobrecarga ou abuso do free tier do Supabase.

---

## 4. Proteção contra Vazamento de Segredos

- O repositório utiliza `.githooks/pre-commit` e job no GitHub Actions para impedir o commit de chaves de API, senhas ou arquivos `.env`.
- Em testes automatizados onde strings simuladas são necessárias para validação de formato, deve-se adicionar a anotação `// allowlist-secret` ao final da linha.
