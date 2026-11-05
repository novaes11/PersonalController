const {
  checkPasswordRequirements,
  renderAuthViewMarkup,
  createAuthViewController,
  createAuthViewElement
} = require('../src/frontend/components/AuthView');
const { renderLandingPage } = require('../src/frontend/pages/renderLandingPage');

describe('E05.T03+ — Validação em Tempo Real de Requisitos de Senha e Alternância de Login/Signup', () => {
  describe('1. Função checkPasswordRequirements()', () => {
    test('Valida individualmente cada um dos 6 critérios de segurança', () => {
      // Vazio
      const emptyCheck = checkPasswordRequirements('', '');
      expect(emptyCheck.length).toBe(false);
      expect(emptyCheck.uppercase).toBe(false);
      expect(emptyCheck.lowercase).toBe(false);
      expect(emptyCheck.number).toBe(false);
      expect(emptyCheck.special).toBe(false);
      expect(emptyCheck.match).toBe(false);
      expect(emptyCheck.allRulesMet).toBe(false);
      expect(emptyCheck.isCompleteSignup).toBe(false);

      // Apenas comprimento
      const lengthOnly = checkPasswordRequirements('abcdefgh', '');
      expect(lengthOnly.length).toBe(true);
      expect(lengthOnly.lowercase).toBe(true);
      expect(lengthOnly.uppercase).toBe(false);
      expect(lengthOnly.number).toBe(false);
      expect(lengthOnly.special).toBe(false);
      expect(lengthOnly.match).toBe(false);

      // Com maiúscula e minúscula
      const upperLower = checkPasswordRequirements('Abcdefgh', '');
      expect(upperLower.uppercase).toBe(true);
      expect(upperLower.lowercase).toBe(true);
      expect(upperLower.number).toBe(false);

      // Com número
      const withNumber = checkPasswordRequirements('Abcdefg1', '');
      expect(withNumber.number).toBe(true);
      expect(withNumber.special).toBe(false);

      // Com caractere especial
      const withSpecial = checkPasswordRequirements('Abcdefg1!', '');
      expect(withSpecial.special).toBe(true);
      expect(withSpecial.allRulesMet).toBe(true);
      expect(withSpecial.match).toBe(false);

      // Com confirmação coincidente (tudo atendido)
      const fullMatch = checkPasswordRequirements('Abcdefg1!', 'Abcdefg1!');
      expect(fullMatch.allRulesMet).toBe(true);
      expect(fullMatch.match).toBe(true);
      expect(fullMatch.isCompleteSignup).toBe(true);

      // Com confirmação divergente
      const mismatch = checkPasswordRequirements('Abcdefg1!', 'Diferente123!');
      expect(mismatch.allRulesMet).toBe(true);
      expect(mismatch.match).toBe(false);
      expect(mismatch.isCompleteSignup).toBe(false);
    });
  });

  describe('2. Renderização de Markup (renderAuthViewMarkup)', () => {
    test('Modo Login (padrão) oculta campos extras de cadastro e exibe botão para criar conta na base', () => {
      const html = renderAuthViewMarkup({ mode: 'login' });

      expect(html).toContain('data-auth-mode="login"');
      expect(html).toContain('id="confirm-password-container" class="hidden"');
      expect(html).toContain('id="password-requirements"');
      expect(html).toContain('class="hidden p-3.5 rounded-xl');
      expect(html).toContain('data-testid="auth-footer-prompt"');
      expect(html).toContain('Não possui uma conta?');
      expect(html).toContain('data-testid="auth-footer-toggle-btn"');
      expect(html).toContain('Criar conta');
      expect(html).toContain('data-toggle-password="auth-password-input"');
    });

    test('Modo Cadastro (signup) exibe input de confirmação de senha, checklist de 6 requisitos e botão para login na base', () => {
      const html = renderAuthViewMarkup({
        mode: 'signup',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

      expect(html).toContain('data-auth-mode="signup"');
      expect(html).toContain('id="confirm-password-container" class="block"');
      expect(html).toContain('data-testid="auth-confirm-password-input"');
      expect(html).toContain('data-toggle-password="auth-confirm-password-input"');
      expect(html).toContain('data-testid="password-requirements"');
      expect(html).toContain('class="block p-3.5 rounded-xl');

      // 6 itens de requisitos no checklist
      expect(html).toContain('data-requirement="length"');
      expect(html).toContain('data-requirement="uppercase"');
      expect(html).toContain('data-requirement="lowercase"');
      expect(html).toContain('data-requirement="number"');
      expect(html).toContain('data-requirement="special"');
      expect(html).toContain('data-requirement="match"');

      // Botão inferior para alternar de volta para Login
      expect(html).toContain('Já possui uma conta?');
      expect(html).toContain('data-testid="auth-footer-toggle-btn"');
      expect(html).toContain('Fazer login');
    });
  });

  describe('3. Controlador (createAuthViewController)', () => {
    test('Bloqueia envio no modo cadastro quando senhas não coincidem', async () => {
      const controller = createAuthViewController({ initialMode: 'signup' });
      controller.setField('email', 'teste@exemplo.com');
      controller.setField('password', 'SenhaForte123!');
      controller.setField('confirmPassword', 'SenhaDiferente456!');

      const result = await controller.submit();
      expect(result.ok).toBe(false);
      expect(controller.getState().errorMessage).toBe('As senhas não coincidem.');
    });

    test('Permite envio no modo cadastro quando confirmação coincide', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          status: 'ok',
          user: { id: 'u-10', email: 'novo@exemplo.com' },
          session: { access_token: 'valid-jwt-token' }
        })
      });

      const controller = createAuthViewController({
        initialMode: 'signup',
        baseUrl: '/api',
        fetchImpl: mockFetch
      });

      controller.setField('email', 'novo@exemplo.com');
      controller.setField('password', 'SenhaForte123!');
      controller.setField('confirmPassword', 'SenhaForte123!');

      const result = await controller.submit();
      expect(result.ok).toBe(true);
      expect(controller.getState().user.email).toBe('novo@exemplo.com');
    });
  });

  describe('4. RenderLandingPage e scripts interativos de validação por digitação', () => {
    test('Contém scripts com escuta de evento input, alternância de visibilidade e alternador de rodapé', () => {
      const html = renderLandingPage({ mode: 'login' });

      // Verificação em tempo real por digitação no evento input e keyup
      expect(html).toContain("passwordInput.addEventListener('input', updatePasswordRequirements)");
      expect(html).toContain("confirmPasswordInput.addEventListener('input', updatePasswordRequirements)");

      // Alternador de visibilidade de senha com ícones
      expect(html).toContain('data-toggle-password');
      expect(html).toContain('EYE_ICON_SVG');
      expect(html).toContain('EYE_OFF_ICON_SVG');

      // Botão inferior de alternância
      expect(html).toContain('authFooterToggleBtn');
      expect(html).toContain("setMode(currentMode === 'signup' ? 'login' : 'signup')");

      // Proteção de campos estritos (SEC-04)
      expect(html).toContain('JSON.stringify({ email, password })');
    });
  });
});
