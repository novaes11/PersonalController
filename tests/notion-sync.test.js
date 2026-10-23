const {
  extractPlainText,
  refineTaskForCopilot
} = require('../scripts/gemini-task-refiner');
const {
  fetchEligibleNotionTasks,
  createGitHubIssue,
  markNotionTaskInProgress,
  syncNotionToGitHub
} = require('../scripts/notion-github-sync');

describe('Fases 5 e 6 — Integração Notion ↔ GitHub com Gemini PM e Copilot Sync', () => {
  test('1. extractPlainText extrai texto puro de diferentes formatos de propriedades do Notion', () => {
    expect(extractPlainText('Texto Simples')).toBe('Texto Simples');
    expect(extractPlainText([{ plain_text: 'Parte 1 ' }, { plain_text: 'Parte 2' }])).toBe('Parte 1 Parte 2');
    expect(extractPlainText({ title: [{ text: { content: 'Título Objeto' } }] })).toBe('Título Objeto');
    expect(extractPlainText(null)).toBe('');
  });

  test('2. refineTaskForCopilot refina tarefas brutas em issues completas com prioridade, domínio e AppSec', () => {
    const mockPage = {
      id: 'page-1234-5678',
      properties: {
        Task: {
          title: [{ plain_text: '[P0] Criar componente de Bottom Nav e Tokens CSS' }]
        }
      }
    };

    const refined = refineTaskForCopilot(mockPage);

    expect(refined.title).toBe('[TASK] [P0] Criar componente de Bottom Nav e Tokens CSS');
    expect(refined.labels).toContain('copilot-agent');
    expect(refined.labels).toContain('p0');
    expect(refined.labels).toContain('frontend');
    expect(refined.body).toContain('page-1234-5678');
    expect(refined.body).toContain('Row Level Security');
    expect(refined.body).toContain('João Vitor Novaes (@novaes11)');
  });

  test('3. fetchEligibleNotionTasks retorna lista vazia quando API key não for informada', async () => {
    const tasks = await fetchEligibleNotionTasks({ apiKey: null });
    expect(tasks).toEqual([]);
  });

  test('4. createGitHubIssue opera em modo Dry-Run sem chamar a API do GitHub', async () => {
    const res = await createGitHubIssue(
      { title: 'Teste Dry Run', body: 'Corpo', labels: ['test'] },
      { isDryRun: true }
    );

    expect(res.number).toBe(999);
    expect(res.html_url).toContain('mock-dry-run');
  });

  test('5. syncNotionToGitHub executa fluxo completo em Dry-Run com mocks de fetch', async () => {
    const mockFetch = jest.fn();

    // Mock da query do Notion
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'notion-page-abc',
            properties: {
              Task: {
                title: [{ plain_text: '[P1] Implementar Worker de Cotações' }]
              }
            }
          }
        ]
      })
    });

    const result = await syncNotionToGitHub({
      apiKey: 'test-key', // allowlist-secret
      databaseId: 'test-db',
      fetchImpl: mockFetch,
      isDryRun: true
    });

    expect(result.syncedCount).toBe(1);
    expect(result.results[0].title).toBe('[TASK] [P1] Implementar Worker de Cotações');
    expect(result.results[0].issueUrl).toContain('mock-dry-run');
  });
});
