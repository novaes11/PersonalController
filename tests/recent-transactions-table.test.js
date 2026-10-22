const {
  fetchTransactions,
  deleteTransactionById
} = require('../src/frontend/services/transactionsApi');

const {
  RecentTransactionsTable,
  renderRecentTransactionsTableMarkup,
  createRecentTransactionsController,
  formatDateBR,
  formatCurrencyBRL
} = require('../src/frontend/components/RecentTransactionsTable');

const mockTransactionsPage1 = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    user_id: 'aaaa1111-1111-4111-a111-111111111111',
    category_id: '55555555-5555-4555-a555-555555555555',
    amount: 120.50,
    date: '2026-10-21',
    description: 'Supermercado Semanal',
    is_automated: false,
    category: {
      id: '55555555-5555-4555-a555-555555555555',
      name: 'Alimentação',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'utensils'
    }
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    user_id: 'aaaa1111-1111-4111-a111-111111111111',
    category_id: '66666666-6666-4666-a666-666666666666',
    amount: 5500.00,
    date: '2026-10-20',
    description: 'Salário Mensal',
    is_automated: false,
    category: {
      id: '66666666-6666-4666-a666-666666666666',
      name: 'Salário',
      type: 'INCOME',
      color: '#10B981',
      icon: 'wallet'
    }
  }
];

const mockTransactionsPage2 = [
  {
    id: '33333333-3333-4333-a333-333333333333',
    user_id: 'aaaa1111-1111-4111-a111-111111111111',
    category_id: '55555555-5555-4555-a555-555555555555',
    amount: 45.00,
    date: '2026-10-18',
    description: 'Padaria',
    is_automated: false,
    category: {
      id: '55555555-5555-4555-a555-555555555555',
      name: 'Alimentação',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'utensils'
    }
  }
];

describe('Tabela de Transações Recentes (E04.T02)', () => {
  describe('Formatadores e Renderização do Componente React', () => {
    it('deve formatar datas para padrão brasileiro e moeda com sinal semântico', () => {
      expect(formatDateBR('2026-10-21')).toBe('21/10/2026');
      expect(formatCurrencyBRL(120.5, 'EXPENSE')).toContain('- R$');
      expect(formatCurrencyBRL(5500, 'INCOME')).toContain('+ R$');
    });

    it('deve renderizar a tabela HTML com linhas, categorias, paginação e botões de exclusão', () => {
      const html = renderRecentTransactionsTableMarkup({
        transactions: mockTransactionsPage1,
        limit: 2,
        offset: 0
      });

      expect(html).toContain('<table id="recent-transactions-table"');
      expect(html).toContain('Supermercado Semanal');
      expect(html).toContain('Salário Mensal');
      expect(html).toContain('21/10/2026');
      expect(html).toContain('Alimentação');
      expect(html).toContain('Despesa');
      expect(html).toContain('Receita');
      expect(html).toContain('data-action="delete" data-transaction-id="11111111-1111-4111-a111-111111111111"');
      expect(html).toContain('Página 1');
      // Na página 1 (offset 0), botão Anterior deve estar disabled e Próxima habilitado (pois 2 === limit)
      expect(html).toMatch(/id="pagination-prev-btn"[^>]*\sdisabled>/);
      expect(html).not.toMatch(/id="pagination-next-btn"[^>]*\sdisabled>/);
    });

    it('deve renderizar estado vazio quando não houver transações', () => {
      const html = renderRecentTransactionsTableMarkup({
        transactions: [],
        limit: 10,
        offset: 0
      });

      expect(html).toContain('Nenhuma transação encontrada neste período.');
      expect(html).not.toContain('<table id="recent-transactions-table"');
    });

    it('deve construir árvore de elementos React via React.createElement e disparar callbacks de exclusão e paginação', () => {
      const createdElements = [];
      const mockReact = {
        createElement: jest.fn((type, props, ...children) => {
          const el = { type, props: props || {}, children: children.flat() };
          createdElements.push(el);
          return el;
        })
      };

      const onDeleteMock = jest.fn();
      const onNextPageMock = jest.fn();

      const tree = RecentTransactionsTable(
        {
          transactions: mockTransactionsPage1,
          limit: 2,
          offset: 0,
          onDelete: onDeleteMock,
          onNextPage: onNextPageMock
        },
        mockReact
      );

      expect(tree.type).toBe('section');
      expect(tree.props.id).toBe('recent-transactions-section');

      const deleteBtn = createdElements.find(
        el => el.type === 'button' && el.props['data-transaction-id'] === mockTransactionsPage1[0].id
      );
      expect(deleteBtn).toBeDefined();
      deleteBtn.props.onClick();
      expect(onDeleteMock).toHaveBeenCalledWith(mockTransactionsPage1[0].id);

      const nextBtn = createdElements.find(
        el => el.type === 'button' && el.props.id === 'pagination-next-btn'
      );
      expect(nextBtn).toBeDefined();
      nextBtn.props.onClick();
      expect(onNextPageMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Carregamento via GET /transactions e Paginação', () => {
    it('deve carregar transações via GET /api/transactions e navegar entre páginas (nextPage e prevPage)', async () => {
      const mockFetch = jest.fn()
        // 1ª chamada: Página 1 (limit=2, offset=0)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'ok',
            count: 2,
            limit: 2,
            offset: 0,
            data: mockTransactionsPage1
          })
        })
        // 2ª chamada: Página 2 (limit=2, offset=2)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'ok',
            count: 1,
            limit: 2,
            offset: 2,
            data: mockTransactionsPage2
          })
        })
        // 3ª chamada: Volta para Página 1 (limit=2, offset=0)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'ok',
            count: 2,
            limit: 2,
            offset: 0,
            data: mockTransactionsPage1
          })
        });

      const controller = createRecentTransactionsController({
        token: 'jwt_token_valido', // allowlist-secret
        baseUrl: '/api',
        limit: 2,
        fetchImpl: mockFetch
      });

      // Carrega página 1
      await controller.loadTransactions();
      let state = controller.getState();
      expect(state.currentPage).toBe(1);
      expect(state.offset).toBe(0);
      expect(state.transactions).toHaveLength(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/transactions?limit=2&offset=0', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer jwt_token_valido' // allowlist-secret
        }
      });

      // Avança para página 2
      await controller.nextPage();
      state = controller.getState();
      expect(state.currentPage).toBe(2);
      expect(state.offset).toBe(2);
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].description).toBe('Padaria');
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/transactions?limit=2&offset=2', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer jwt_token_valido' // allowlist-secret
        }
      });

      // Volta para página 1
      await controller.prevPage();
      state = controller.getState();
      expect(state.currentPage).toBe(1);
      expect(state.offset).toBe(0);
      expect(state.transactions).toHaveLength(2);
    });
  });

  describe('Exclusão de Transação via DELETE /transactions/:id', () => {
    it('deve enviar DELETE /api/transactions/:id e remover a transação excluída da tabela', async () => {
      const targetId = mockTransactionsPage1[0].id;

      const mockFetch = jest.fn()
        // 1ª chamada: GET /api/transactions
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'ok',
            count: 2,
            limit: 10,
            offset: 0,
            data: mockTransactionsPage1
          })
        })
        // 2ª chamada: DELETE /api/transactions/:id
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'ok',
            message: 'Transação excluída com sucesso',
            data: mockTransactionsPage1[0]
          })
        });

      const onDeletedSpy = jest.fn();
      const controller = createRecentTransactionsController({
        token: 'jwt_token_valido', // allowlist-secret
        baseUrl: '/api',
        limit: 10,
        fetchImpl: mockFetch,
        onTransactionDeleted: onDeletedSpy
      });

      await controller.loadTransactions();
      expect(controller.getState().transactions).toHaveLength(2);

      const deleteResult = await controller.deleteTransaction(targetId);

      expect(deleteResult.ok).toBe(true);
      expect(onDeletedSpy).toHaveBeenCalledWith(mockTransactionsPage1[0]);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `/api/transactions/${targetId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer jwt_token_valido' // allowlist-secret
        }
      });

      // A transação excluída não deve mais constar no estado da tabela
      const remaining = controller.getState().transactions;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(mockTransactionsPage1[1].id);
    });

    it('deve tratar erro caso DELETE /api/transactions/:id retorne 404', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Transação não encontrada para exclusão'
        })
      });

      await expect(
        deleteTransactionById('99999999-9999-4999-a999-999999999999', {
          token: 'jwt_token_valido', // allowlist-secret
          fetchImpl: mockFetch
        })
      ).rejects.toThrow('Transação não encontrada para exclusão');
    });
  });
});
