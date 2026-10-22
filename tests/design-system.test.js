const {
  PRIMITIVE_TOKENS,
  SEMANTIC_TOKENS,
  COMPONENT_TOKENS,
  MOBILE_FIRST_BREAKPOINTS,
  calculateContrastRatio,
  getDesignTokensCss
} = require('../src/frontend/styles/designSystem');

describe('Design System & Tokens CSS Mobile-First (E05.T01)', () => {
  describe('Arquitetura de Tokens em 3 Camadas (Primitive -> Semantic -> Component)', () => {
    it('deve exportar tokens primitivos com escala de espaçamento em múltiplos de 4px/8px', () => {
      const spacingValues = Object.values(PRIMITIVE_TOKENS.spacing);
      expect(spacingValues.length).toBeGreaterThanOrEqual(8);
      for (const px of spacingValues) {
        expect(px % 4).toBe(0);
      }
    });

    it('deve garantir touch targets mínimos de 44px para ergonomia mobile-first', () => {
      expect(PRIMITIVE_TOKENS.ergonomics.touchTargetMinPx).toBeGreaterThanOrEqual(44);
      expect(COMPONENT_TOKENS.button.minHeightPx).toBeGreaterThanOrEqual(44);
      expect(COMPONENT_TOKENS.input.minHeightPx).toBeGreaterThanOrEqual(44);
    });

    it('deve definir breakpoints mobile-first iniciando em 375px até 1280px', () => {
      expect(MOBILE_FIRST_BREAKPOINTS).toEqual({
        xs: 375,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280
      });
    });
  });

  describe('Acessibilidade e Contraste WCAG AA (>= 4.5:1)', () => {
    it('deve garantir contraste >= 4.5:1 para textos primários e secundários no Dark Mode', () => {
      const dark = SEMANTIC_TOKENS.dark;

      const primaryOnSurface = calculateContrastRatio(dark.textPrimary, dark.bgSurface);
      const secondaryOnSurface = calculateContrastRatio(dark.textSecondary, dark.bgSurface);
      const incomeOnSurface = calculateContrastRatio(dark.statusIncomeFg, dark.bgSurface);
      const expenseOnSurface = calculateContrastRatio(dark.statusExpenseFg, dark.bgSurface);

      expect(primaryOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(secondaryOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(incomeOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(expenseOnSurface).toBeGreaterThanOrEqual(4.5);
    });

    it('deve garantir contraste >= 4.5:1 para textos primários e secundários no Light Mode', () => {
      const light = SEMANTIC_TOKENS.light;

      const primaryOnSurface = calculateContrastRatio(light.textPrimary, light.bgSurface);
      const secondaryOnSurface = calculateContrastRatio(light.textSecondary, light.bgSurface);

      expect(primaryOnSurface).toBeGreaterThanOrEqual(4.5);
      expect(secondaryOnSurface).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Folha de Estilos CSS (design-tokens.css)', () => {
    it('deve conter variáveis CSS das 3 camadas, safe-area-inset e prefers-reduced-motion', () => {
      const css = getDesignTokensCss();

      // Camada Primitive
      expect(css).toContain('--color-slate-950:');
      expect(css).toContain('--space-4:  16px;');
      expect(css).toContain('--touch-target-min: 44px;');

      // Camada Semantic
      expect(css).toContain('--bg-canvas:   var(--color-slate-950);');
      expect(css).toContain('--text-primary:   var(--color-slate-50);');
      expect(css).toContain('[data-theme="light"]');

      // Camada Component
      expect(css).toContain('--card-bg:      var(--bg-surface);');
      expect(css).toContain('--button-min-height: var(--touch-target-min);');
      expect(css).toContain('--bottom-nav-height: 64px;');

      // Mobile-First & Acessibilidade
      expect(css).toContain('env(safe-area-inset-bottom');
      expect(css).toContain('@media (min-width: 768px)');
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    });
  });
});
