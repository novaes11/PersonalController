const {
  signupSchema,
  loginSchema,
  sanitizeUser
} = require('../src/schemas/auth.schema');

const {
  createCategorySchema,
  updateCategorySchema,
  sanitizeCategory
} = require('../src/schemas/categories.schema');

const {
  createTransactionSchema,
  updateTransactionSchema,
  sanitizeTransaction
} = require('../src/schemas/transactions.schema');

describe('Blindagem de Schemas e Mass Assignment (SEC-04)', () => {
  describe('Auth Schemas - .strict()', () => {
    it('signupSchema deve rejeitar payload com role ou campos não declarados', () => {
      const payload = {
        email: 'attacker@exemplo.com',
        password: 'senha_segura_123', // allowlist-secret
        role: 'admin',
        is_admin: true
      };
      const result = signupSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
      expect(result.error.issues[0].keys).toContain('role');
      expect(result.error.issues[0].keys).toContain('is_admin');
    });

    it('loginSchema deve rejeitar payload com campos extras desconhecidos', () => {
      const payload = {
        email: 'user@exemplo.com',
        password: 'senha_valida_123', // allowlist-secret
        extra_key: 'malicious_content'
      };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
    });

    it('sanitizeUser deve filtrar metadados internos e senhas', () => {
      const internalUser = {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'user@exemplo.com',
        created_at: '2026-10-14T00:00:00Z',
        encrypted_password: 'hash_secreto_nao_vazar', // allowlist-secret
        internal_db_flag: true,
        role: 'admin'
      };
      const sanitized = sanitizeUser(internalUser);
      expect(sanitized).toEqual({
        id: '11111111-1111-4111-a111-111111111111',
        email: 'user@exemplo.com',
        created_at: '2026-10-14T00:00:00Z'
      });
      expect(sanitized.encrypted_password).toBeUndefined();
      expect(sanitized.internal_db_flag).toBeUndefined();
    });
  });

  describe('Categories Schemas - .strict()', () => {
    it('createCategorySchema deve rejeitar user_id e campos arbitrários', () => {
      const payload = {
        name: 'Categoria Fraudulenta',
        type: 'EXPENSE',
        user_id: '99999999-9999-4999-a999-999999999999',
        is_system: true
      };
      const result = createCategorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
      expect(result.error.issues[0].keys).toContain('user_id');
      expect(result.error.issues[0].keys).toContain('is_system');
    });

    it('updateCategorySchema deve rejeitar campos proibidos na atualização', () => {
      const payload = {
        name: 'Nome Atualizado',
        id: '99999999-9999-4999-a999-999999999999',
        user_id: '11111111-1111-4111-a111-111111111111'
      };
      const result = updateCategorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
    });

    it('sanitizeCategory deve formatar categoria sem vazar campos internos', () => {
      const rawCategory = {
        id: '55555555-5555-4555-a555-555555555555',
        name: 'Alimentação',
        type: 'EXPENSE',
        color: '#EF4444',
        icon: 'utensils',
        user_id: null,
        created_at: '2026-10-14T00:00:00Z',
        secret_internal_tag: 'sensitive'
      };
      const sanitized = sanitizeCategory(rawCategory);
      expect(sanitized.secret_internal_tag).toBeUndefined();
      expect(sanitized.name).toBe('Alimentação');
      expect(sanitized.type).toBe('EXPENSE');
    });
  });

  describe('Transactions Schemas - .strict()', () => {
    it('createTransactionSchema deve rejeitar user_id, id, role e created_at', () => {
      const payload = {
        amount: 50.00,
        date: '2026-10-14',
        user_id: '99999999-9999-4999-a999-999999999999',
        id: '00000000-0000-4000-a000-000000000000',
        created_at: '2026-01-01T00:00:00Z',
        is_admin: true
      };
      const result = createTransactionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
      expect(result.error.issues[0].keys).toContain('user_id');
      expect(result.error.issues[0].keys).toContain('id');
      expect(result.error.issues[0].keys).toContain('created_at');
    });

    it('updateTransactionSchema deve rejeitar user_id e id na atualização', () => {
      const payload = {
        amount: 80.00,
        user_id: '99999999-9999-4999-a999-999999999999',
        id: '11111111-1111-4111-a111-111111111111'
      };
      const result = updateTransactionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
    });

    it('sanitizeTransaction deve manter campos de contrato e filtrar metadados internos', () => {
      const rawTx = {
        id: '99999999-9999-4999-a999-999999999999',
        user_id: '11111111-1111-4111-a111-111111111111',
        category_id: '55555555-5555-4555-a555-555555555555',
        amount: 150.00,
        date: '2026-10-14',
        description: 'Jantar comemorativo',
        is_automated: false,
        created_at: '2026-10-14T00:00:00Z',
        internal_database_cursor: 'xy123_hidden',
        database_partition_key: 42
      };
      const sanitized = sanitizeTransaction(rawTx);
      expect(sanitized.id).toBe('99999999-9999-4999-a999-999999999999');
      expect(sanitized.amount).toBe(150.00);
      expect(sanitized.internal_database_cursor).toBeUndefined();
      expect(sanitized.database_partition_key).toBeUndefined();
    });
  });
});
