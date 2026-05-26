// 根布局 - 深色主题配置

import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '🏠',
    assets: '💰',
    investments: '📈',
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

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#2a2a3e', height: 60, paddingBottom: 8 },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#6b6b7b',
        }}
      >
        <Tabs.Screen name="index" options={{ title: '首页', tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} /> }} />
        <Tabs.Screen name="assets" options={{ title: '资产', tabBarIcon: ({ focused }) => <TabIcon name="assets" focused={focused} /> }} />
        <Tabs.Screen name="investments" options={{ title: '投资', tabBarIcon: ({ focused }) => <TabIcon name="investments" focused={focused} /> }} />
        <Tabs.Screen name="settings" options={{ title: '设置', tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} /> }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, opacity: 0.6 },
  iconFocused: { opacity: 1 },
});