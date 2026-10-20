const {
  buildTransactionPayload,
  fetchCategories,
  submitTransaction
} = require('../src/frontend/services/transactionsApi');

const {
  TransactionForm,
  renderTransactionFormMarkup,
  createTransactionFormController
} = require('../src/frontend/components/TransactionForm');

const { createTransactionSchema } = require('../src/schemas/transactions.schema');

const mockCategories = [
  {
    id: '55555555-5555-4555-a555-555555555555',
    name: 'Alimentação',
    type: 'EXPENSE',
    color: '#EF4444',
    icon: 'utensils'
  },
  {
    id: '66666666-6666-4666-a666-666666666666',
    name: 'Salário',
    type: 'INCOME',
    color: '#10B981',
    icon: 'wallet'
  }
];

describe('Formulário de Input Manual de Transação (E04.T01)', () => {
  describe('Renderização do Componente React (Dropdown e Campos)', () => {
    it('deve renderizar o dropdown de categorias e os campos amount, date e description no HTML', () => {
      const html = renderTransactionFormMarkup({
        categories: mockCategories,
        values: {
          category_id: '55555555-5555-4555-a555-555555555555',
          amount: '125.90',
          date: '2026-10-19',
          description: 'Mercado Semanal'
        }
      });

      expect(html).toContain('<form id="manual-transaction-form"');
      expect(html).toContain('<select id="transaction-category" name="category_id"');
      expect(html).toContain('<option value="">Selecione uma categoria</option>');
      expect(html).toContain('value="55555555-5555-4555-a555-555555555555" data-type="EXPENSE" selected>Alimentação (Despesa)</option>');
      expect(html).toContain('value="66666666-6666-4666-a666-666666666666" data-type="INCOME">Salário (Receita)</option>');
      expect(html).toContain('<input id="transaction-amount" name="amount" type="number"');
      expect(html).toContain('value="125.90"');
      expect(html).toContain('<input id="transaction-date" name="date" type="date"');
      expect(html).toContain('value="2026-10-19"');
      expect(html).toContain('<input id="transaction-description" name="description" type="text"');
      expect(html).toContain('value="Mercado Semanal"');
      expect(html).toContain('type="submit"');
    });

    it('deve construir árvore de elementos React via React.createElement e acionar callbacks', () => {
      const mockReact = {
        createElement: jest.fn((type, props, ...children) => ({
          type,
          props: props || {},
          children: children.flat()
        }))
      };

      const onSubmitMock = jest.fn();
      const onChangeMock = jest.fn();

      const tree = TransactionForm(
        {
          categories: mockCategories,
          values: {
            category_id: mockCategories[0].id,
            amount: '89.50',
            date: '2026-10-19',
            description: 'Almoço Executivo'
          },
          onChange: onChangeMock,
          onSubmit: onSubmitMock
        },
        mockReact
      );

      expect(tree.type).toBe('form');
      expect(tree.props.id).toBe('manual-transaction-form');
      expect(mockReact.createElement).toHaveBeenCalledWith(
        'select',
        expect.objectContaining({ id: 'transaction-category', name: 'category_id' }),
        expect.any(Array)
      );

      // Simula submissão do formulário React
      const fakeEvent = { preventDefault: jest.fn() };
      tree.props.onSubmit(fakeEvent);
      expect(fakeEvent.preventDefault).toHaveBeenCalled();
      expect(onSubmitMock).toHaveBeenCalledWith(
        {
          category_id: mockCategories[0].id,
          amount: '89.50',
          date: '2026-10-19',
          description: 'Almoço Executivo'
        },
        fakeEvent
      );
    });
  });

  describe('Validação de Payload e Compatibilidade Estrita com Backend (SEC-04)', () => {
    it('deve construir JSON válido compatível com createTransactionSchema (.strict())', () => {
      const result = buildTransactionPayload({
        category_id: '55555555-5555-4555-a555-555555555555',
        amount: '250.5',
        date: '2026-10-19',
        description: ' Supermercado Mensal ',
        // Tentativa de injetar campos extras no objeto bruto: não devem ir para o payload final
        user_id: '99999999-9999-4999-a999-999999999999',
        role: 'admin'
      });

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual({
        category_id: '55555555-5555-4555-a555-555555555555',
        amount: 250.5,
        date: '2026-10-19',
        description: 'Supermercado Mensal',
        is_automated: false
      });
      expect(result.payload.user_id).toBeUndefined();

      // Valida diretamente contra o schema Zod do backend
      const backendValidation = createTransactionSchema.safeParse(result.payload);
      expect(backendValidation.success).toBe(true);
    });

    it('deve rejeitar valores negativos, vazios ou datas malformadas', () => {
      const invalidResult = buildTransactionPayload({
        category_id: 'uuid-invalido',
        amount: '-10',
        date: '19/10/2026',
        description: 'Teste'
      });

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
      expect(invalidResult.errors.map(e => e.field)).toEqual(
        expect.arrayContaining(['amount', 'date', 'category_id'])
      );
    });
  });

  describe('Integração com API: GET /api/categories e POST /api/transactions', () => {
    it('deve carregar categorias e enviar requisição POST com JSON válido e token Bearer', async () => {
      const mockFetch = jest.fn()
        // 1ª chamada: GET /api/categories
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: 'ok',
            count: 2,
            data: mockCategories
          })
        })
        // 2ª chamada: POST /api/transactions
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            status: 'ok',
            data: {
              id: '99999999-9999-4999-a999-999999999999',
              user_id: '11111111-1111-4111-a111-111111111111',
              category_id: mockCategories[0].id,
              amount: 149.90,
              date: '2026-10-19',
              description: 'Jantar em família',
              is_automated: false
            }
          })
        });

      const onCreatedSpy = jest.fn();
      const controller = createTransactionFormController({
        token: 'jwt_token_valido', // allowlist-secret
        baseUrl: '/api',
        fetchImpl: mockFetch,
        initialValues: { date: '2026-10-19' },
        onTransactionCreated: onCreatedSpy
      });

      // 1. Carrega categorias para o dropdown
      const loadedCategories = await controller.loadCategories();
      expect(loadedCategories).toHaveLength(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/categories', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer jwt_token_valido' // allowlist-secret
        }
      });

      // 2. Preenche campos do formulário
      controller.setFieldValue('category_id', mockCategories[0].id);
      controller.setFieldValue('amount', '149.90');
      controller.setFieldValue('description', 'Jantar em família');

      // 3. Submete o formulário (POST /api/transactions)
      const submitResult = await controller.submit();

      expect(submitResult.ok).toBe(true);
      expect(submitResult.data.amount).toBe(149.90);
      expect(onCreatedSpy).toHaveBeenCalledTimes(1);

      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer jwt_token_valido' // allowlist-secret
        },
        body: JSON.stringify({
          amount: 149.9,
          date: '2026-10-19',
          category_id: mockCategories[0].id,
          description: 'Jantar em família',
          is_automated: false
        })
      });

      // 4. Verifica se limpou os campos de valor e descrição após sucesso
      const finalState = controller.getState();
      expect(finalState.values.amount).toBe('');
      expect(finalState.values.description).toBe('');
      expect(finalState.successMessage).toBe('Transação registrada com sucesso!');
    });

    it('deve capturar erros de API quando o POST retornar status 400 ou 500', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Dados inválidos para criação da transação'
        })
      });

      await expect(
        submitTransaction(
          {
            category_id: mockCategories[0].id,
            amount: '50.00',
            date: '2026-10-19',
            description: 'Teste erro'
          },
          { token: 'jwt_token_valido', fetchImpl: mockFetch } // allowlist-secret
        )
      ).rejects.toThrow('Dados inválidos para criação da transação');
    });
  });
});
