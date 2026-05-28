// 根布局 - 主题配置 + 深色/亮色切换

import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '🏠',
    assets: '💰',
    investments: '📈',
    import: '📷',
    settings: '⚙️',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

function RootLayoutInner() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === '#0f0f1a' ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.tabBar },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, height: 60, paddingBottom: 8 },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen name="index" options={{ title: '首页', tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} /> }} />
        <Tabs.Screen name="assets" options={{ title: '资产', tabBarIcon: ({ focused }) => <TabIcon name="assets" focused={focused} /> }} />
        <Tabs.Screen name="investments" options={{ title: '投资', tabBarIcon: ({ focused }) => <TabIcon name="investments" focused={focused} /> }} />
        <Tabs.Screen name="import" options={{ title: '导入', tabBarIcon: ({ focused }) => <TabIcon name="import" focused={focused} /> }} />
        <Tabs.Screen name="settings" options={{ title: '设置', tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} /> }} />
      </Tabs>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, opacity: 0.6 },
  iconFocused: { opacity: 1 },
});