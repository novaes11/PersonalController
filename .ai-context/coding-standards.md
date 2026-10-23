# Padrões de Código e Diretrizes de Engenharia — PersonalController

## 1. Backend (Node.js & Express)

- **Módulos:** CommonJS (`require` / `module.exports`).
- **Validação com Zod:** Todos os schemas de entrada de dados devem ser estritos (`.strict()`), impedindo a injeção de propriedades não mapeadas (Mass Assignment — SEC-04).
- **Tratamento de Erros:** Todas as rotas devem capturar exceções com `try/catch` e repassar para o middleware centralizado de erros em `server.js`.
- **Status HTTP Semânticos:**
  - `200 OK`: Consultas, listagens e exclusões bem-sucedidas.
  - `201 Created`: Recursos criados com sucesso (`POST /transactions`, `POST /auth/signup`).
  - `400 Bad Request`: Falha de validação de payload (retornar lista de erros detalhada).
  - `401 Unauthorized`: Ausência de token JWT ou credenciais inválidas.
  - `403 Forbidden`: Tentativa de acesso a recurso de outro usuário.
  - `404 Not Found`: Recurso não localizado.
  - `429 Too Many Requests`: Excesso de requisições disparado pelo Rate Limiting (SEC-05).
  - `500 Internal Server Error`: Erro inesperado do servidor.

---

## 2. Frontend (Mobile-First SPA)

- **Ergonomia e Touch Targets:**
  - Todo elemento interativo (botões, inputs, abas) deve respeitar a área mínima de toque de `44x44px` (`--touch-target-min: 44px`).
  - Botão de ação rápida (`+ Nova Transação`) deve ter pelo menos `48x48px`.
  - Respeitar a safe area inferior dos smartphones com `padding-bottom: env(safe-area-inset-bottom)`.
- **Arquitetura de Tokens (CSS):**
  - Utilizar os tokens semânticos definidos em `src/frontend/styles/design-tokens.css` (`--bg-canvas`, `--bg-surface`, `--text-primary`, `--border-subtle`, `--status-income-fg`, etc.).
  - Evitar cores hexadecimais soltas no meio do markup.
- **Acessibilidade (WCAG AA):**
  - Contraste mínimo de `4.5:1` para textos sobre qualquer superfície.
  - Todos os ícones devem ser em SVG inline com `aria-hidden="true"`.
  - Navegação por teclado suportando `Tab`, `Enter`, `Space` e setas direcionais.
  - Suporte a `prefers-reduced-motion` desativando transições bruscas.

---

## 3. Padrão de Commits (Conventional Commits)

Os commits devem ser estruturados como:
- `feat(escopo): descrição concisa`
- `fix(escopo): correção de problema`
- `test(escopo): adição ou ajuste de testes`
- `refactor(escopo): melhoria interna sem alteração de comportamento`
- `docs(escopo): atualização de documentação`
- `chore(escopo): tarefas de manutenção de dependências ou build`
