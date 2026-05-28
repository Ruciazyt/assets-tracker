// Theme Context - dark/light theme with persistent preference

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  gain: string;
  loss: string;
  border: string;
  tabBar: string;
  tabBarBorder: string;
}

const darkColors: ThemeColors = {
  background: '#0f0f1a',
  backgroundSecondary: '#16213e',
  card: '#1a1a2e',
  cardSecondary: '#252540',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  textMuted: '#6b6b7b',
  accent: '#6366f1',
  accentText: '#ffffff',
  gain: '#22c55e',
  loss: '#ef4444',
  border: '#2a2a3e',
  tabBar: '#1a1a2e',
  tabBarBorder: '#2a2a3e',
};

const lightColors: ThemeColors = {
  background: '#f5f5f5',
  backgroundSecondary: '#eeeeee',
  card: '#ffffff',
  cardSecondary: '#f0f0f0',
  text: '#1a1a2e',
  textSecondary: '#666666',
  textMuted: '#999999',
  accent: '#6366f1',
  accentText: '#ffffff',
  gain: '#22c55e',
  loss: '#ef4444',
  border: '#dddddd',
  tabBar: '#ffffff',
  tabBarBorder: '#eeeeee',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  isDark: true,
});

const THEME_KEY = '@assets_tracker/theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Load persisted theme
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
    });
  }, []);

  const toggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}