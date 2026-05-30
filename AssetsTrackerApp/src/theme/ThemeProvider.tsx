// Apple 风格主题 Provider — 单一浅色主题，无 dark/light 切换

import React, { createContext, useContext, ReactNode } from 'react';
import { colors, spacing, radius, typography, shadows } from './tokens';

export interface AppTheme {
  colors: typeof colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
}

const theme: AppTheme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
};

const ThemeContext = createContext<AppTheme>(theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
