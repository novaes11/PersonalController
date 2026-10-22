const fs = require('fs');
const path = require('path');

/**
 * 1. Camada Primitive (Valores Brutos)
 */
const PRIMITIVE_TOKENS = {
  colors: {
    slate950: '#020617',
    slate900: '#0F172A',
    slate800: '#1E293B',
    slate700: '#334155',
    slate400: '#94A3B8',
    slate300: '#CBD5E1',
    slate200: '#E2E8F0',
    slate100: '#F1F5F9',
    slate50: '#F8FAFC',
    white: '#FFFFFF',
    indigo600: '#4F46E5',
    indigo500: '#6366F1',
    indigo400: '#818CF8',
    emerald500: '#10B981',
    emerald400: '#34D399',
    emerald950: '#022C22',
    rose500: '#F43F5E',
    rose400: '#FB7185',
    rose950: '#4C0519',
    amber400: '#FBBF24'
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64
  },
  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  },
  ergonomics: {
    touchTargetMinPx: 44,
    touchTargetComfortablePx: 48
  }
};

/**
 * 2. Camada Semantic (Mapeamento por Propósito para Dark e Light Mode)
 */
const SEMANTIC_TOKENS = {
  dark: {
    bgCanvas: PRIMITIVE_TOKENS.colors.slate950,
    bgSurface: PRIMITIVE_TOKENS.colors.slate900,
    bgElevated: PRIMITIVE_TOKENS.colors.slate800,
    textPrimary: PRIMITIVE_TOKENS.colors.slate50,
    textSecondary: PRIMITIVE_TOKENS.colors.slate300,
    textMuted: PRIMITIVE_TOKENS.colors.slate400,
    borderSubtle: PRIMITIVE_TOKENS.colors.slate800,
    borderStrong: PRIMITIVE_TOKENS.colors.slate700,
    brandPrimary: PRIMITIVE_TOKENS.colors.indigo600,
    brandPrimaryHover: PRIMITIVE_TOKENS.colors.indigo500,
    focusRing: PRIMITIVE_TOKENS.colors.indigo400,
    statusIncomeFg: PRIMITIVE_TOKENS.colors.emerald400,
    statusExpenseFg: PRIMITIVE_TOKENS.colors.rose400,
    statusWarningFg: PRIMITIVE_TOKENS.colors.amber400
  },
  light: {
    bgCanvas: PRIMITIVE_TOKENS.colors.slate50,
    bgSurface: PRIMITIVE_TOKENS.colors.white,
    bgElevated: PRIMITIVE_TOKENS.colors.slate100,
    textPrimary: PRIMITIVE_TOKENS.colors.slate950,
    textSecondary: PRIMITIVE_TOKENS.colors.slate700,
    textMuted: PRIMITIVE_TOKENS.colors.slate700,
    borderSubtle: PRIMITIVE_TOKENS.colors.slate200,
    borderStrong: PRIMITIVE_TOKENS.colors.slate300,
    brandPrimary: PRIMITIVE_TOKENS.colors.indigo600,
    brandPrimaryHover: PRIMITIVE_TOKENS.colors.indigo500,
    focusRing: PRIMITIVE_TOKENS.colors.indigo500,
    statusIncomeFg: '#047857',
    statusExpenseFg: '#BE123C',
    statusWarningFg: '#B45309'
  }
};

/**
 * 3. Camada Component (Tokens Específicos de Componentes)
 */
const COMPONENT_TOKENS = {
  card: {
    bg: 'var(--bg-surface)',
    border: 'var(--border-subtle)',
    paddingMobilePx: PRIMITIVE_TOKENS.spacing[4],
    paddingDesktopPx: PRIMITIVE_TOKENS.spacing[6],
    radiusPx: 12
  },
  button: {
    bg: 'var(--brand-primary)',
    bgHover: 'var(--brand-primary-hover)',
    fg: 'var(--color-white)',
    minHeightPx: PRIMITIVE_TOKENS.ergonomics.touchTargetMinPx
  },
  input: {
    bg: 'var(--bg-canvas)',
    border: 'var(--border-strong)',
    fg: 'var(--text-primary)',
    minHeightPx: PRIMITIVE_TOKENS.ergonomics.touchTargetMinPx
  },
  navigation: {
    bottomNavHeightPx: 64,
    sidebarWidthPx: 256
  }
};

/**
 * Breakpoints Mobile-First padronizados (em pixels).
 */
const MOBILE_FIRST_BREAKPOINTS = {
  xs: 375, // Smartphone base (iPhone SE / telas compactas)
  sm: 640, // Smartphones grandes / phablets
  md: 768, // Tablets (transição Bottom Nav -> Sidebar)
  lg: 1024, // Desktops compactos / laptops
  xl: 1280 // Monitores widescreen
};

/**
 * Converte cor hexadecimal (#RRGGBB) para luminância relativa WCAG 2.1.
 * @param {string} hex
 */
function getRelativeLuminance(hex) {
  const clean = String(hex).replace('#', '').trim();
  if (clean.length !== 6) {
    throw new Error(`Cor hexadecimal inválida: ${hex}`);
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const [R, G, B] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calcula a razão de contraste WCAG 2.1 entre duas cores hexadecimais.
 * @param {string} foregroundHex
 * @param {string} backgroundHex
 * @returns {number} Razão de contraste (ex: 14.52)
 */
function calculateContrastRatio(foregroundHex, backgroundHex) {
  const lum1 = getRelativeLuminance(foregroundHex);
  const lum2 = getRelativeLuminance(backgroundHex);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

/**
 * Lê o conteúdo da folha de estilos de Design Tokens CSS.
 */
function getDesignTokensCss() {
  const cssPath = path.join(__dirname, 'design-tokens.css');
  return fs.readFileSync(cssPath, 'utf8');
}

module.exports = {
  PRIMITIVE_TOKENS,
  SEMANTIC_TOKENS,
  COMPONENT_TOKENS,
  MOBILE_FIRST_BREAKPOINTS,
  getRelativeLuminance,
  calculateContrastRatio,
  getDesignTokensCss
};
