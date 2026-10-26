/**
 * PersonalController — Gemini Task Refiner (Fase 6)
 *
 * Atua como o PM Sênior e Arquiteto de Software, ingerindo as diretrizes de
 * `/squad/agents/project-manager-senior.md` e `/squad/agents/security-appsec-engineer.md`
 * para converter tarefas brutas do Notion em especificações técnicas de alta fidelidade
 * prontas para execução pelo GitHub Copilot Coding Agent.
 */

function extractPlainText(titleProperty) {
  if (!titleProperty) return '';
  if (Array.isArray(titleProperty)) {
    return titleProperty.map(t => t.plain_text || t.text?.content || '').join('');
  }
  if (Array.isArray(titleProperty.title)) {
    return titleProperty.title.map(t => t.plain_text || t.text?.content || '').join('');
  }
  return String(titleProperty);
}

/**
 * Refina os requisitos de uma tarefa do Notion e produz o corpo estruturado da Issue
 * compatível com `.github/ISSUE_TEMPLATE/copilot_task.md`.
 *
 * @param {object} notionPage Dados da página retornados pela Notion API
 * @param {object} options Opções adicionais de contexto (ex: projectName)
 * @returns {{ title: string, body: string, labels: string[] }}
 */
function refineTaskForCopilot(notionPage = {}, options = {}) {
  const pageId = notionPage.id || 'N/A';
  const properties = notionPage.properties || {};
  const projectName = options.projectName || process.env.NOTION_PROJECT_NAME || 'PersonalController';

  const rawTitle = extractPlainText(properties.Task || properties.Name || properties.title) || 'Tarefa Sem Título';
  const cleanTitle = rawTitle.replace(/^\[(P\d)\]\s*/i, '').trim();
  const priorityMatch = rawTitle.match(/^\[(P\d)\]/i);
  const priority = priorityMatch ? priorityMatch[1].toUpperCase() : 'P1';

  // Identificação automática do domínio técnico
  let domain = 'Fullstack';
  const lower = rawTitle.toLowerCase();
  if (lower.includes('css') || lower.includes('ui') || lower.includes('view') || lower.includes('frontend') || lower.includes('bottom nav') || lower.includes('card')) {
    domain = 'Frontend / UI';
  } else if (lower.includes('worker') || lower.includes('cron') || lower.includes('api') || lower.includes('endpoint') || lower.includes('rate limit')) {
    domain = 'Backend / API';
  } else if (lower.includes('tabela') || lower.includes('rls') || lower.includes('migration') || lower.includes('schema')) {
    domain = 'Database / Supabase';
  }

  const issueTitle = `[TASK] [${priority}] ${cleanTitle}`;

  const body = `## 📋 Contexto da Demanda
- **Identificador Notion:** \`${pageId}\`
- **Projeto:** ${projectName}
- **Módulo / Domínio:** ${domain}
- **Prioridade:** ${priority}
- **Responsável Técnico / Aprovador:** João Vitor Novaes (@novaes11)

---

## 🎯 Objetivo Arquitetural
Implementar **${cleanTitle}** com foco no princípio da menor alteração possível (*Minimal Change*), mantendo a integridade dos contratos de API e a conformidade com as regras de segurança e design tokens do projeto.

---

## 🛠️ Arquivos & Módulos Recomendados para Consulta
- \`src/frontend/styles/design-tokens.css\` (Design System Mobile-First)
- \`src/frontend/components/\`
- \`server.js\` & \`src/routes/\`
- \`tests/\`
- \`.ai-context/architecture.md\`
- \`.ai-context/security.md\`

---

## 📝 Instruções para o GitHub Copilot Coding Agent
> Consulte obrigatoriamente as diretrizes em:
> - \`.github/copilot-instructions.md\`
> - \`/squad/agents/engineering-minimal-change-engineer.md\`
> - \`/squad/agents/security-appsec-engineer.md\`
> - \`/squad/agents/testing-test-automation-engineer.md\`

1. **Princípio da Menor Alteração:** Não refatore código não relacionado. Mantenha os contratos JSON de \`GET /\` e \`GET /health\` íntegros.
2. **Mobile-First por Padrão:** Em componentes de UI, garanta touch targets \`>= 44px\`, navegação por teclado e respeito a \`env(safe-area-inset-bottom)\`.
3. **Segurança (AppSec):** 
   - Row Level Security: valide se todas as queries filtram por \`(SELECT auth.uid())\`.
   - Zod Schemas: mantenha \`.strict()\` em todas as entradas de dados.
4. **Testes Obrigatórios:** Adicione novos testes em \`tests/\` e execute \`npm test\` garantindo 100% de sucesso.
5. **Pull Request:** Formate a descrição com base em \`.github/pull_request_template.md\` e inclua \`Closes #<numero_da_issue>\`.
6. **Governança:** Não execute merge. A aprovação final e o merge são exclusivos de **João Vitor Novaes (@novaes11)**.

---

## ✅ Critérios de Aceite
- [ ] Implementação de **${cleanTitle}** concluída sem regressões
- [ ] Testes unitários/integração adicionados no Jest e passando
- [ ] 100% dos testes da suíte passando (\`npm test\`)
- [ ] Auditoria de segurança aprovada (zero secrets vazados, RLS preservada)
- [ ] Pull Request aberto e aguardando revisão manual de @novaes11`;

  const labels = ['copilot-agent', 'development', priority.toLowerCase()];
  if (domain.includes('Frontend')) labels.push('frontend');
  if (domain.includes('Backend')) labels.push('backend');

  return {
    title: issueTitle,
    body,
    labels
  };
}

module.exports = {
  extractPlainText,
  refineTaskForCopilot
};
