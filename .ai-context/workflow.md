# Fluxo de Trabalho & Governança — PersonalController

## 1. Princípios de Governança Estrita

1. **Aprovador Exclusivo: João Vitor Novaes (@novaes11)**
   - Nenhum agente de IA, script ou pipeline possui permissão para mergear Pull Requests na branch `main`.
   - O merge é 100% manual e depende da revisão técnica do usuário.
2. **Zero Commits na `main`**:
   - Todo ciclo de desenvolvimento ocorre em branches isoladas criadas a partir da `main` atualizada: `feat/...`, `fix/...`, `test/...`, `refactor/...`.
3. **Pós-Merge Obrigatório (Limpeza de Branches)**:
   - Assim que o usuário aprovar e mergear um PR, a branch local e remota deve ser removida (`git fetch origin --prune && git branch -d <branch>`), o repositório local sincronizado e o card correspondente no Notion marcado como `Concluído` com a data de conclusão.

---

## 2. Ciclo de Vida de uma Tarefa

```text
[Notion] Task definida com critérios de aceite
   │
   ▼
[Git] Criação de branch de feature (ex: feat/e05-t05-mobile-transactions)
   │
   ▼
[Squad] Atuação dos Agentes (/squad/agents/):
   - PM Senior: Planeja escopo e critérios
   - Minimal Change: Implementa código estritamente necessário
   - AppSec: Audita RLS, schemas Zod e injeções
   - Test Automation: Cria testes Jest cobrindo 100% das novas regras
   │
   ▼
[Verificação Local] Execução de npm test (100% de sucesso)
   │
   ▼
[Commit & Push] Conventional Commits + Push para origin/<branch>
   │
   ▼
[Pull Request] Abertura de PR com gh pr create usando o template pr-formatter
   │
   ▼
[GitHub Actions] Execução dos checks: build-and-test, squad, Vercel preview
   │
   ▼
[Revisão & Aprovação Humana] @novaes11 revisa e faz o merge manual
   │
   ▼
[Finalização] Atualização do Notion para 'Concluído' e remoção da branch
```

---

## 3. Padrão de Pull Request (`pr-formatter`)

Todo Pull Request deve conter:
- Header com aviso de aprovação exclusiva por João Vitor Novaes.
- Identificador e título da task no Notion.
- Tabela Markdown detalhando arquivos alterados e propósito.
- Checklist de Auditoria de Segurança (AppSec).
- Bloco de código com evidência da execução dos testes do Jest.
- Checklist de governança com caixas de aprovação humana desmarcadas.
