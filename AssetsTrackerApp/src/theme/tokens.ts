// Apple 风格设计令牌 — 基于 DESIGN.md
// 所有 UI 常量统一从这里引用，禁止硬编码

export const colors = {
  // 品牌 & 交互
  primary: '#0066cc',           // Action Blue — 唯一的交互色
  primaryFocus: '#0071e3',      // focus ring 用色
  primaryOnDark: '#2997ff',     // 深色表面上的蓝色链接

  // 表面
  canvas: '#ffffff',            // 纯白画布
  parchment: '#f5f5f7',         // Apple 灰白底色（主背景）
  pearl: '#fafafc',             // 次级按钮底色

  // 文字
  ink: '#1d1d1f',               // 主文字（近黑）
  textSecondary: '#333333',     // 次级文字
  textMuted: '#7a7a7a',         // 辅助/禁用文字

  // 分割线 & 边框
  divider: '#f0f0f0',           // 柔和分割线
  hairline: '#e0e0e0',          // 细边框

  // 语义色（盈亏）
  gain: '#34c759',              // Apple 系统绿 — 盈
  loss: '#ff3b30',              // Apple 系统红 — 亏
  gainBackground: 'rgba(52, 199, 89, 0.08)',
  lossBackground: 'rgba(255, 59, 48, 0.08)',

  // Tab bar
  tabBarBg: '#ffffff',
  tabBarBorder: '#f0f0f0',
  tabBarActive: '#0066cc',
  tabBarInactive: '#7a7a7a',

  // 状态
  disabled: '#cccccc',
  overlay: 'rgba(0, 0, 0, 0.3)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 80,
} as const;

export const radius = {
  none: 0,
  xs: 5,
  sm: 8,
  md: 11,
  lg: 18,
  pill: 9999,
} as const;

// 排版预设 — 匹配 Apple SF Pro 风格
export const typography = {
  displayMd: {
    fontSize: 34,
    fontWeight: '600' as const,
    lineHeight: 34 * 1.47,
    letterSpacing: -0.374,
  },
  displayLg: {
    fontSize: 40,
    fontWeight: '600' as const,
    lineHeight: 40 * 1.1,
    letterSpacing: 0,
  },
  tagline: {
    fontSize: 21,
    fontWeight: '600' as const,
    lineHeight: 21 * 1.19,
    letterSpacing: 0.231,
  },
  bodyStrong: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 17 * 1.24,
    letterSpacing: -0.374,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 17 * 1.47,
    letterSpacing: -0.374,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 14 * 1.43,
    letterSpacing: -0.224,
  },
  captionStrong: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 14 * 1.29,
    letterSpacing: -0.224,
  },
  button: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 17 * 1.24,
    letterSpacing: -0.374,
  },
  buttonLarge: {
    fontSize: 18,
    fontWeight: '300' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  finePrint: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 12,
    letterSpacing: -0.12,
  },
} as const;

// 阴影 — 仅用于卡片，与 Apple 的唯一阴影哲学一致
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;
