// 根布局 - 主题配置 + 深色/亮色切换 + PIN 锁屏

import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import LockScreen from './lock';
import { useEffect, useRef } from 'react';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { colors } = useTheme();
  const icons: Record<string, string> = {
    index: '🏠',
    assets: '💰',
    investments: '📈',
    import: '📷',
    settings: '⚙️',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[
        styles.icon,
        { color: focused ? colors.accent : colors.textMuted },
      ]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  const { isLocked, pinEnabled, lock } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (pinEnabled) {
          lock();
        }
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [pinEnabled, lock]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.tabBar },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, height: 60, paddingBottom: 8 },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen name="index" options={{ title: '首页', tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="index" focused={focused} /> }} />
        <Tabs.Screen name="assets" options={{ title: '资产', tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="assets" focused={focused} /> }} />
        <Tabs.Screen name="investments" options={{ title: '投资', tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="investments" focused={focused} /> }} />
        <Tabs.Screen name="import" options={{ title: '导入', tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="import" focused={focused} /> }} />
        <Tabs.Screen name="settings" options={{ title: '设置', tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="settings" focused={focused} /> }} />
      </Tabs>
      {isLocked && <LockScreen />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
});