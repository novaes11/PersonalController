# GitHub Copilot Instructions — PersonalController

Você é o executor técnico autônomo do projeto **PersonalController**. Seu objetivo é implementar código de alta fidelidade, criar testes automatizados e manter a conformidade arquitetural com o menor raio de impacto possível.

---

## 1. Fonte da Verdade: Esquadrão de Agentes

Antes de planejar ou realizar qualquer alteração, consulte obrigatoriamente os perfis e diretrizes em:
👉 **`/squad/agents/`**

Agentes obrigatórios para consulta de comportamento:
1. **`project-manager-senior.md`**: Planejamento, rastreabilidade de tasks e validação de critérios de aceite.
2. **`engineering-minimal-change-engineer.md`**: Princípio da Menor Alteração Possível (Minimal Change). Nunca refatore arquivos não relacionados à tarefa atual.
3. **`security-appsec-engineer.md`**: Segurança por padrão (AppSec), validação de RLS no Supabase, sanitização contra XSS e SQL Injection.
4. **`testing-test-automation-engineer.md`**: Criação de testes unitários e de integração obrigatórios (Jest / Supertest).
5. **`engineering-code-reviewer.md`**: Revisão estrita de legibilidade, performance e conformidade de tipos/schemas.

---

## 2. Regra Fundamental de Governança

> [!IMPORTANT]
> **Aprovador Exclusivo: João Vitor Novaes (@novaes11)**
> Nenhum agente de IA ou automação possui permissão para realizar o merge de Pull Requests diretamente na branch `main`.
> O merge depende 100% da revisão técnica manual do usuário.

- **Zero commits diretos na `main`**: Toda alteração deve nascer em uma branch de feature dedicada (`feat/...`, `fix/...`, `refactor/...`).
- **Commits Semânticos**: Utilize o padrão *Conventional Commits* (ex: `feat(frontend): ...`, `test(api): ...`, `fix(quotes): ...`).
- **Formatação de PRs**: Todo Pull Request gerado deve seguir rigorosamente o template [`.github/pull_request_template.md`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/.github/pull_request_template.md) e a skill [`.agents/skills/pr-formatter/SKILL.md`](file:///c:/Users/jvnno/Documents/GitHub/PersonalController/.agents/skills/pr-formatter/SKILL.md).

---

## 3. Padrões Técnicos e Arquitetura

### A. Backend & APIs (Node.js / Express)
- Módulos em CommonJS (`require` / `module.exports`), compatíveis com runtime Node.js 22.
- **Validação de Payload Estrita (SEC-04)**: Toda entrada em endpoints de mutação (`POST`, `PUT`, `PATCH`) deve ser validada por schemas Zod configurados com `.strict()`, rejeitando Mass Assignment.
- **Isolamento Multi-tenant (RLS)**: Toda tabela de dados do usuário no PostgreSQL/Supabase possui Row Level Security ativo com políticas baseadas em `(SELECT auth.uid())`. Nunca execute queries que ignorem o `user_id`.
- **Rate Limiting (SEC-05)**: Endpoints públicos e autenticados são protegidos pelos middlewares em `src/middlewares/rateLimit.middleware.js`.

### B. Frontend (Mobile-First SPA)
- **Ergonomia Mobile-First**: Desenvolva sempre a experiência móvel (`< 768px`) primeiro:
  - Touch targets mínimos de `44x44px` (`min-height: 44px; min-width: 44px;`).
  - Botão de ação rápida central no mobile (`+ Nova Transação`) com touch target `>= 48x48px`.
  - Bottom Navigation Bar fixa no mobile (`h-16 md:hidden`) com respeito à área segura (`env(safe-area-inset-bottom)`).
  - Sidebar Lateral fixa no tablet/desktop (`hidden md:flex md:w-64`).
- **Design Tokens**: Utilize as variáveis e classes do Design System oficial em `src/frontend/styles/design-tokens.css` (3 camadas: Primitive -> Semantic -> Component).
- **Acessibilidade**: Ícones exclusivamente vetoriais em SVG inline com `aria-hidden="true"` (sem emojis estruturais).

### C. Estratégia de Testes
- Toda funcionalidade ou correção deve ser acompanhada de testes automatizados em `tests/` utilizando **Jest**.
- Bateria completa executada via `npm test` antes de submeter alterações. A suíte deve passar com 100% de sucesso.
- Mocks para APIs externas de cotações (Brapi, AwesomeAPI) para garantir testes determinísticos e rápidos.

### D. Proteção de Segredos
- Nunca atribua chaves ou tokens hardcoded no código de produção.
- Em arquivos de teste onde valores dummy simulam tokens ou senhas, adicione o comentário `// allowlist-secret` ao final da linha para evitar bloqueio pelo hook de segurança.

---

## 4. Contexto Complementar
Para especificações detalhadas de arquitetura, fluxo e padrões, consulte os arquivos em:
👉 **`/.ai-context/`**
- `architecture.md`: Visão arquitetural completa do sistema.
- `workflow.md`: Fluxo de trabalho Notion -> GitHub -> CI/CD.
- `coding-standards.md`: Guia de código e estilo.
- `security.md`: Auditoria e regras de AppSec.
- `testing-strategy.md`: Diretrizes e cobertura de testes.
- `product-vision.md`: Visão do produto e KPIs acionáveis.
- `backlog-roadmap.md`: Histórico de épicos e visão futura.
