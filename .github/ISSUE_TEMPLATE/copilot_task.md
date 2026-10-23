---
name: 🤖 Copilot Coding Task
about: Tarefa estruturada para implementação autônoma pelo GitHub Copilot Coding Agent
title: '[TASK] '
labels: ['copilot-agent', 'development']
assignees: []
---

## 📋 Contexto da Demanda
- **Identificador Notion:** `{{NOTION_TASK_ID}}`
- **Módulo / Domínio:** [ex: Frontend / Backend / Quotes / Auth]
- **Prioridade:** P0 | P1 | P2
- **Responsável Técnico / Aprovador:** João Vitor Novaes (@novaes11)

---

## 🎯 Objetivo
<!-- Descrição clara e concisa do que deve ser implementado ou corrigido. -->

---

## 🛠️ Arquivos & Módulos Relacionados
<!-- Liste os arquivos principais que devem ser lidos ou alterados. -->
- `src/...`
- `tests/...`

---

## 📝 Instruções para o GitHub Copilot Coding Agent
> Consulte obrigatoriamente as diretrizes em:
> - `.github/copilot-instructions.md`
> - `/squad/agents/engineering-minimal-change-engineer.md`
> - `/squad/agents/security-appsec-engineer.md`
> - `/squad/agents/testing-test-automation-engineer.md`

1. **Princípio da Menor Alteração:** Altere exclusivamente o necessário para atender ao escopo desta issue.
2. **Testes Automatizados:** Crie testes em `tests/` cobrindo 100% dos novos fluxos e garanta que `npm test` passe.
3. **Segurança (AppSec):** 
   - Row Level Security: mantenha o isolamento com `(SELECT auth.uid())`.
   - Zod Schemas: utilize `.strict()` para impedir Mass Assignment.
4. **Pull Request:** Abra o PR utilizando o template oficial em `.github/pull_request_template.md`.
5. **Governança:** Não faça merge; a aprovação é exclusiva de João Vitor Novaes (@novaes11).

---

## ✅ Critérios de Aceite
- [ ] Implementação funcional conforme especificação
- [ ] Testes unitários/integração adicionados e validados no Jest
- [ ] 100% dos testes da suíte passando (`npm test`)
- [ ] Nenhum segredo ou credencial exposta
- [ ] Pull Request criado e aguardando aprovação manual de @novaes11
