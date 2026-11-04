const request = require('supertest');
const zlib = require('zlib');
const {
  extractTextFromPdfBuffer,
  classifyTransactionCategory,
  parseStatementText,
  parsePdfStatement
} = require('../src/services/pdfParser.service');

const mockUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'usuario.pdf@exemplo.com'
};

const AUTH_HEADER = 'Bearer valid_token';

const mockUserCategories = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    name: 'Alimentação',
    type: 'EXPENSE'
  },
  {
    id: '22222222-2222-4222-8222-000000000002',
    name: 'Transporte',
    type: 'EXPENSE'
  },
  {
    id: '33333333-3333-4333-8333-000000000003',
    name: 'Salário',
    type: 'INCOME'
  },
  {
    id: '44444444-4444-4444-8444-000000000004',
    name: 'Moradia',
    type: 'EXPENSE'
  }
];

let lastInsertedRows = [];

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn(async (jwt) => {
          if (jwt === 'valid_token') {
            return { data: { user: mockUser }, error: null };
          }
          return { data: { user: null }, error: { message: 'Invalid JWT' } };
        })
      },
      from: jest.fn((tableName) => {
        if (tableName === 'categories') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockUserCategories,
              error: null
            })
          };
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: jest.fn((rows) => {
            lastInsertedRows = rows;
            return {
              select: jest.fn().mockResolvedValue({
                data: rows.map((row, idx) => ({
                  id: `88888888-8888-4888-8888-88888888880${idx}`,
                  ...row
                })),
                error: null
              })
            };
          })
        };
      })
    })),
    supabase: {}
  };
});

const app = require('../server');

/**
 * Helper para construir um buffer PDF válido (com ou sem compressão FlateDecode)
 */
function buildSyntheticPdfBuffer(lines, { compressed = false } = {}) {
  const postScriptOps = [
    'BT',
    '/F1 12 Tf',
    ...lines.map((line) => `(${line}) Tj`),
    'ET'
  ].join('\n');

  if (!compressed) {
    const content = `%PDF-1.4\n1 0 obj\n<< /Length ${postScriptOps.length} >>\nstream\n${postScriptOps}\nendstream\nendobj\n%%EOF`;
    return Buffer.from(content, 'latin1');
  }

  const deflated = zlib.deflateSync(Buffer.from(postScriptOps, 'latin1'));
  const header = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode /Length ${deflated.length} >>\nstream\n`,
    'latin1'
  );
  const footer = Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1');
  return Buffer.concat([header, deflated, footer]);
}

describe('E07.T01 - PDF Statement Parser Service & Endpoints', () => {
  beforeEach(() => {
    lastInsertedRows = [];
  });

  describe('1. Unit Tests - extractTextFromPdfBuffer', () => {
    it('deve extrair texto de um buffer PDF não comprimido com operadores Tj', () => {
      const pdfBuffer = buildSyntheticPdfBuffer([
        'EXTRATO CONTA CORRENTE',
        '05/10/2026 IFOOD *RESTAURANTE -45,90',
        '10/10/2026 UBER *VIAGEM -22,50'
      ]);

      const text = extractTextFromPdfBuffer(pdfBuffer);
      expect(text).toContain('EXTRATO CONTA CORRENTE');
      expect(text).toContain('05/10/2026 IFOOD *RESTAURANTE -45,90');
      expect(text).toContain('10/10/2026 UBER *VIAGEM -22,50');
    });

    it('deve descompactar streams /FlateDecode e extrair operadores de texto do PDF', () => {
      const pdfBuffer = buildSyntheticPdfBuffer(
        [
          'FATURA CARTAO NUBANK',
          '12/10/2026 SUPERMERCADO EXTRA R$ 310,45',
          '15/10/2026 NETFLIX.COM R$ 55,90'
        ],
        { compressed: true }
      );

      const base64DataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      const text = extractTextFromPdfBuffer(base64DataUri);

      expect(text).toContain('FATURA CARTAO NUBANK');
      expect(text).toContain('12/10/2026 SUPERMERCADO EXTRA R$ 310,45');
      expect(text).toContain('15/10/2026 NETFLIX.COM R$ 55,90');
    });

    it('deve rejeitar arquivo com assinatura inválida (não-PDF) com status 400', () => {
      const invalidBuffer = Buffer.from('NOT_A_PDF_FILE_CONTENT', 'utf8');
      expect(() => extractTextFromPdfBuffer(invalidBuffer)).toThrow(/Assinatura de arquivo inválida/i);
    });

    it('deve rejeitar conteúdo vazio ou ausente', () => {
      expect(() => extractTextFromPdfBuffer('')).toThrow(/Conteúdo do PDF não fornecido/i);
      expect(() => extractTextFromPdfBuffer(Buffer.alloc(0))).toThrow(/vazio/i);
    });
  });

  describe('2. Unit Tests - classifyTransactionCategory', () => {
    it('deve classificar despesas de alimentação, transporte e moradia com alta confiança (>= 0.85)', () => {
      const food = classifyTransactionCategory('IFOOD *HAMBURGUERIA', 'EXPENSE', mockUserCategories);
      expect(food.suggested_category_name).toBe('Alimentação');
      expect(food.suggested_category_id).toBe('11111111-1111-4111-8111-000000000001');
      expect(food.confidence_score).toBeGreaterThanOrEqual(0.85);
      expect(food.needs_review).toBe(false);

      const transport = classifyTransactionCategory('UBER *TRIP SAO PAULO', 'EXPENSE', mockUserCategories);
      expect(transport.suggested_category_name).toBe('Transporte');
      expect(transport.suggested_category_id).toBe('22222222-2222-4222-8222-000000000002');
      expect(transport.confidence_score).toBeGreaterThanOrEqual(0.85);
      expect(transport.needs_review).toBe(false);

      const housing = classifyTransactionCategory('CONTA DE LUZ ENEL ENERGIA', 'EXPENSE', mockUserCategories);
      expect(housing.suggested_category_name).toBe('Moradia');
      expect(housing.suggested_category_id).toBe('44444444-4444-4444-8444-000000000004');
      expect(housing.needs_review).toBe(false);
    });

    it('deve classificar receitas de salário e vincular à categoria do usuário', () => {
      const salary = classifyTransactionCategory('CREDITO SALARIO FOLHA PAGAMENTO', 'INCOME', mockUserCategories);
      expect(salary.suggested_category_name).toBe('Salário');
      expect(salary.suggested_category_id).toBe('33333333-3333-4333-8333-000000000003');
      expect(salary.confidence_score).toBeGreaterThanOrEqual(0.9);
      expect(salary.needs_review).toBe(false);
    });

    it('deve sinalizar needs_review = true para descrições ambíguas com confiança < 0.85', () => {
      const ambiguous = classifyTransactionCategory('PAGTO ELETRONICO LOJA XPTO 9921', 'EXPENSE', mockUserCategories);
      expect(ambiguous.confidence_score).toBeLessThan(0.85);
      expect(ambiguous.needs_review).toBe(true);
    });
  });

  describe('3. Unit Tests - parseStatementText & parsePdfStatement', () => {
    it('deve extrair transações de extrato bancário (receitas e despesas) e ignorar linhas de saldo', () => {
      const sampleBankText = [
        'EXTRATO DE CONTA CORRENTE - OUTUBRO 2026',
        '01/10/2026 SALDO ANTERIOR R$ 2.500,00',
        '05/10/2026 CREDITO SALARIO EMPRESA TECH +6.500,00',
        '07/10/2026 SUPERMERCADO PAO DE ACUCAR -420,80',
        '10/10/2026 UBER *VIAGEM 28,90 D',
        '12/10/2026 PIX RECEBIDO REEMBOLSO 150,00 C',
        '15/10/2026 COMPRA COMERCIO XYZ -89,90',
        '31/10/2026 SALDO DO DIA R$ 8.610,40'
      ].join('\n');

      const result = parseStatementText(sampleBankText, {
        userCategories: mockUserCategories,
        referenceYear: 2026,
        documentType: 'BANK_STATEMENT'
      });

      expect(result.document_type).toBe('BANK_STATEMENT');
      expect(result.transactions).toHaveLength(5);

      const [txSalary, txMarket, txUber, txPix, txAmbiguous] = result.transactions;

      expect(txSalary).toMatchObject({
        date: '2026-10-05',
        amount: 6500,
        type: 'INCOME',
        suggested_category_name: 'Salário',
        suggested_category_id: '33333333-3333-4333-8333-000000000003',
        needs_review: false
      });

      expect(txMarket).toMatchObject({
        date: '2026-10-07',
        amount: 420.8,
        type: 'EXPENSE',
        suggested_category_name: 'Alimentação',
        suggested_category_id: '11111111-1111-4111-8111-000000000001',
        needs_review: false
      });

      expect(txUber).toMatchObject({
        date: '2026-10-10',
        amount: 28.9,
        type: 'EXPENSE',
        suggested_category_name: 'Transporte',
        suggested_category_id: '22222222-2222-4222-8222-000000000002'
      });

      expect(txPix).toMatchObject({
        date: '2026-10-12',
        amount: 150,
        type: 'INCOME'
      });

      expect(txAmbiguous.needs_review).toBe(true);
      expect(txAmbiguous.fingerprint).toHaveLength(16);

      expect(result.summary).toEqual({
        total_extracted: 5,
        total_income: 6650,
        total_expense: 539.6,
        net_amount: 6110.4,
        high_confidence_count: 4,
        review_required_count: 1
      });
    });

    it('deve extrair compras de fatura de cartão de crédito (formato DD MMM e DD/MM) e ignorar pagamento da fatura anterior', () => {
      const sampleCreditCardText = [
        'FATURA CARTAO DE CREDITO VENCIMENTO 15/10/2026',
        '02/10 PAGAMENTO RECEBIDO -1.850,00',
        '04/10 IFOOD *PIZZARIA R$ 79,90',
        '08 OUT DROGASIL FARMACIA R$ 44,50',
        '11 OUT SPOTIFY BRASIL R$ 21,90',
        'TOTAL DA FATURA R$ 146,30'
      ].join('\n');

      const result = parsePdfStatement(
        {
          raw_text: sampleCreditCardText,
          document_type: 'CREDIT_CARD_INVOICE',
          reference_year: 2026
        },
        {
          userCategories: mockUserCategories
        }
      );

      expect(result.document_type).toBe('CREDIT_CARD_INVOICE');
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions[0]).toMatchObject({
        date: '2026-10-04',
        amount: 79.9,
        type: 'EXPENSE',
        suggested_category_name: 'Alimentação'
      });
      expect(result.transactions[1]).toMatchObject({
        date: '2026-10-08',
        amount: 44.5,
        type: 'EXPENSE'
      });
      expect(result.transactions[2]).toMatchObject({
        date: '2026-10-11',
        amount: 21.9,
        type: 'EXPENSE'
      });
      expect(result.summary.total_expense).toBe(146.3);
    });
  });

  describe('4. Integration Tests - POST /transactions/parse-pdf & POST /transactions/batch', () => {
    it('POST /transactions/parse-pdf sem JWT deve retornar 401 (SEC-03)', async () => {
      const res = await request(app)
        .post('/transactions/parse-pdf')
        .send({ raw_text: '05/10/2026 IFOOD -45,90' });

      expect(res.statusCode).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('POST /transactions/parse-pdf com campo não reconhecido deve retornar 400 (.strict() SEC-04)', async () => {
      const res = await request(app)
        .post('/transactions/parse-pdf')
        .set('Authorization', AUTH_HEADER)
        .send({
          raw_text: '05/10/2026 IFOOD -45,90',
          user_id: '99999999-9999-4999-8999-999999999999'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('POST /transactions/parse-pdf sem pdf_base64 nem raw_text deve retornar 400', async () => {
      const res = await request(app)
        .post('/transactions/parse-pdf')
        .set('Authorization', AUTH_HEADER)
        .send({ document_type: 'AUTO' });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('POST /transactions/parse-pdf com pdf_base64 comprimido (/FlateDecode) deve retornar 200 e lista pré-classificada', async () => {
      const pdfBuffer = buildSyntheticPdfBuffer(
        [
          'EXTRATO BANCARIO',
          '05/10/2026 CREDITO SALARIO +5.000,00',
          '06/10/2026 IFOOD *DELIVERY -64,90',
          '07/10/2026 UBER *TRIP -19,50'
        ],
        { compressed: true }
      );

      const res = await request(app)
        .post('/api/transactions/parse-pdf')
        .set('Authorization', AUTH_HEADER)
        .send({
          pdf_base64: pdfBuffer.toString('base64'),
          document_type: 'BANK_STATEMENT',
          reference_year: 2026
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data.transactions).toHaveLength(3);
      expect(res.body.data.summary).toMatchObject({
        total_extracted: 3,
        total_income: 5000,
        total_expense: 84.4
      });
      expect(res.body.data.transactions[0].suggested_category_id).toBe('33333333-3333-4333-8333-000000000003');
      expect(res.body.data.transactions[1].suggested_category_id).toBe('11111111-1111-4111-8111-000000000001');
      expect(res.body.data.transactions[2].suggested_category_id).toBe('22222222-2222-4222-8222-000000000002');
    });

    it('POST /transactions/batch deve persistir lote de transações vinculando user_id exclusivamente do token JWT (201)', async () => {
      const res = await request(app)
        .post('/transactions/batch')
        .set('Authorization', AUTH_HEADER)
        .send({
          transactions: [
            {
              category_id: '11111111-1111-4111-8111-000000000001',
              amount: 64.9,
              date: '2026-10-06',
              description: 'IFOOD *DELIVERY',
              is_automated: true
            },
            {
              category_id: '22222222-2222-4222-8222-000000000002',
              amount: 19.5,
              date: '2026-10-07',
              description: 'UBER *TRIP'
            }
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.count).toBe(2);
      expect(lastInsertedRows).toHaveLength(2);
      expect(lastInsertedRows[0].user_id).toBe(mockUser.id);
      expect(lastInsertedRows[1].user_id).toBe(mockUser.id);
      expect(lastInsertedRows[1].is_automated).toBe(true);
    });

    it('POST /transactions/batch deve rejeitar tentativa de Mass Assignment com user_id injetado no item (400 SEC-04)', async () => {
      const res = await request(app)
        .post('/transactions/batch')
        .set('Authorization', AUTH_HEADER)
        .send({
          transactions: [
            {
              user_id: '99999999-9999-4999-8999-999999999999',
              category_id: '11111111-1111-4111-8111-000000000001',
              amount: 100,
              date: '2026-10-06',
              description: 'Tentativa IDOR'
            }
          ]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });
});
