# Guia Operacional do GitHub Copilot Coding Agent — PersonalController

Este documento define o procedimento padrão para acionamento, supervisão e revisão técnica do **GitHub Copilot Coding Agent** no ciclo de desenvolvimento do **PersonalController**.

---

## 1. Como Acionar o Copilot Coding Agent em uma Issue

1. **Abertura da Issue:**
   - Crie uma issue utilizando o template oficial: `.github/ISSUE_TEMPLATE/copilot_task.md`.
   - Adicione o label: `copilot-agent`.
2. **Atribuição ao Copilot:**
   - Nos comentários da issue ou na descrição inicial, mencione:
     ```markdown
     @github-copilot implemente esta tarefa seguindo estritamente as diretrizes em .github/copilot-instructions.md e /squad/agents/.
     ```
   - O Copilot Coding Agent criará automaticamente uma branch isolada (ex: `copilot/issue-XX-descricao`), executará a implementação e abrirá um Pull Request rascunho ou pronto para revisão.

---

## 2. Fontes de Contexto Ingeridas pelo Copilot

O Copilot Coding Agent consome automaticamente:
1. **`.github/copilot-instructions.md`**: Regras mestras de governança, arquitetura e convenções.
2. **`squad/agents/`**:
   - `engineering-minimal-change-engineer.md`: Garante menor raio de alteração.
   - `security-appsec-engineer.md`: Garante isolamento de RLS e schemas Zod estritos.
   - `testing-test-automation-engineer.md`: Garante criação de testes com Jest.
   - `project-manager-senior.md`: Rastreabilidade com o backlog do Notion.
3. **`.ai-context/`**: Especificações arquiteturais e estratégias de teste.
4. **`.github/pull_request_template.md`**: Formatação padronizada do PR.

---

## 3. Checklist de Revisão Humana Obrigatória (@novaes11)

Antes de aprovar e mergear qualquer Pull Request gerado pelo Copilot Coding Agent:

- [ ] **Raio de Impacto:** O Copilot alterou apenas os arquivos necessários para a issue?
- [ ] **Row Level Security (RLS):** As consultas ao Supabase respeitam `(SELECT auth.uid())`?
- [ ] **Schemas Zod:** Os endpoints possuem validação `.strict()` (SEC-04)?
- [ ] **Evidência de Testes:** Novos testes unitários/integração foram criados e passaram?
- [ ] **CI Checks:** Todos os checks (`build-and-test`, `squad`, `CodeQL`, `Vercel`) estão verdes?
- [ ] **Merge Manual:** Concluir o merge exclusivamente de forma manual e deletar a branch.
