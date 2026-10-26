/**
 * PersonalController — Notion to GitHub Issue Synchronizer (Fase 5)
 *
 * Sincroniza tarefas marcadas como "Ready For Development" ou "Não iniciado" no Notion
 * para criação automatizada de GitHub Issues formatadas e prontas para o Copilot Coding Agent,
 * aplicando regras estritas de isolamento por projeto.
 */

const { refineTaskForCopilot } = require('./gemini-task-refiner');

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || 'e8dc8924-7ab1-83f1-a029-01bde21e3dcf';
const NOTION_PROJECT_ID = process.env.NOTION_PROJECT_ID || 'b08c8924-7ab1-8326-9a9d-01260b4983cb'; // PersonalController Notion Page ID
const NOTION_PROJECT_NAME = process.env.NOTION_PROJECT_NAME || 'PersonalController';
const NOTION_API_KEY = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN; // allowlist-secret
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // allowlist-secret
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'novaes11/PersonalController';

/**
 * Normaliza identificadores removendo traços para comparação insensível a formato.
 */
function normalizeId(id) {
  return String(id || '').replace(/-/g, '').toLowerCase();
}

/**
 * Validação defensiva de regra de negócio: verifica se a tarefa pertence ao projeto alvo.
 */
function matchesTargetProject(notionPage, projectId = NOTION_PROJECT_ID, projectName = NOTION_PROJECT_NAME) {
  if (!projectId && !projectName) return true;
  const props = notionPage?.properties || {};

  // 1. Verificação primária via Relation (campo 'Projetos')
  const projetosProp = props.Projetos || props.Projeto || props.Project;
  if (projetosProp && Array.isArray(projetosProp.relation)) {
    if (projectId) {
      const targetId = normalizeId(projectId);
      return projetosProp.relation.some(rel => normalizeId(rel.id) === targetId);
    }
  }

  // 2. Verificação secundária via Select ou Rich Text (se houver)
  if (projetosProp) {
    const selectName = projetosProp.select?.name;
    if (selectName) {
      return selectName.toLowerCase().includes(projectName.toLowerCase());
    }
  }

  // Se nenhum projectId foi definido, aceita; caso contrário, rejeita para evitar contaminação
  return !projectId;
}

/**
 * Consulta tarefas elegíveis no banco de dados do Notion com isolamento por projeto.
 */
async function fetchEligibleNotionTasks(options = {}) {
  const {
    apiKey = NOTION_API_KEY,
    databaseId = NOTION_DATABASE_ID,
    projectId = NOTION_PROJECT_ID,
    projectName = NOTION_PROJECT_NAME,
    fetchImpl = global.fetch
  } = options;

  if (!apiKey) {
    return [];
  }

  const statusFilters = [
    { property: 'Status', status: { equals: 'Ready For Development' } },
    { property: 'Status', status: { equals: 'Não iniciado' } }
  ];

  const filterPayload = {
    and: [
      { or: statusFilters }
    ]
  };

  if (projectId) {
    filterPayload.and.push({
      property: 'Projetos',
      relation: { contains: projectId }
    });
  }

  let response = await fetchImpl(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: filterPayload,
      page_size: 20
    })
  });

  // Fallback defensivo: se falhar com filtro de relação (ex: schema de teste sem relação), tenta apenas status
  if (!response.ok && projectId) {
    response = await fetchImpl(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { or: statusFilters },
        page_size: 20
      })
    });
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao consultar Notion (HTTP ${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rawResults = Array.isArray(data.results) ? data.results : [];

  // Garante isolamento estrito via validação defensiva em memória
  return rawResults.filter(page => matchesTargetProject(page, projectId, projectName));
}

/**
 * Cria uma GitHub Issue para a tarefa refinada pelo Gemini.
 */
async function createGitHubIssue(issueData, options = {}) {
  const { token = GITHUB_TOKEN, repository = GITHUB_REPOSITORY, fetchImpl = global.fetch, isDryRun = false } = options;

  if (isDryRun || !token) {
    return {
      id: 999,
      number: 999,
      html_url: `https://github.com/${repository}/issues/mock-dry-run`,
      title: issueData.title
    };
  }

  const response = await fetchImpl(`https://api.github.com/repos/${repository}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'PersonalController-NotionSync'
    },
    body: JSON.stringify({
      title: issueData.title,
      body: issueData.body,
      labels: issueData.labels
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao criar Issue no GitHub (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Atualiza o status da tarefa no Notion para "Em andamento".
 */
async function markNotionTaskInProgress(pageId, issueUrl, options = {}) {
  const { apiKey = NOTION_API_KEY, fetchImpl = global.fetch, isDryRun = false } = options;

  if (isDryRun || !apiKey) {
    return { ok: true, isDryRun: true };
  }

  const response = await fetchImpl(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        Status: {
          status: { name: 'Em andamento' }
        }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao atualizar Notion Page ${pageId} (HTTP ${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Orquestra o ciclo completo de sincronização Notion -> Gemini Refine -> GitHub Issue.
 */
async function syncNotionToGitHub(options = {}) {
  const isDryRun = options.isDryRun || process.argv.includes('--dry-run');
  const tasks = await fetchEligibleNotionTasks(options);
  const projectName = options.projectName || NOTION_PROJECT_NAME;

  if (tasks.length === 0) {
    return {
      syncedCount: 0,
      message: 'Nenhuma tarefa elegível encontrada no Notion para o projeto configurado.'
    };
  }

  const results = [];
  for (const page of tasks) {
    const refined = refineTaskForCopilot(page, { projectName });
    const issue = await createGitHubIssue(refined, { ...options, isDryRun });
    await markNotionTaskInProgress(page.id, issue.html_url, { ...options, isDryRun });

    results.push({
      pageId: page.id,
      title: refined.title,
      issueUrl: issue.html_url
    });
  }

  return {
    syncedCount: results.length,
    results
  };
}

if (require.main === module) {
  syncNotionToGitHub()
    .then(res => {
      console.log('Sincronização concluída com sucesso:', JSON.stringify(res, null, 2));
    })
    .catch(err => {
      console.error('Erro na sincronização:', err.message);
      process.exit(1);
    });
}

module.exports = {
  fetchEligibleNotionTasks,
  createGitHubIssue,
  markNotionTaskInProgress,
  syncNotionToGitHub,
  matchesTargetProject
};
