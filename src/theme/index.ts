export const colors = {
  bg: '#F4F6F4',
  primary: '#8DAA91',
  primaryLight: '#C5D5C8',
  primaryDk: '#5E7E63',
  accent: '#E5987D',
  darkCard: '#301B28',
  text: '#2D312E',
  textMid: '#6B7471',
  textSecondary: '#8DAA91',
  textInactive: '#A0AAB2',
  white: '#FFFFFF',
  red: '#E15B5B',
  yellow: '#F5A623',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  full: 999,
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '800' as const, letterSpacing: -0.3 },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8 },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 11.5, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '600' as const },
};
