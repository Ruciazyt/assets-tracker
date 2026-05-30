// 根布局 — Apple 风格 3-tab 导航

import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useAppTheme } from '../src/theme/ThemeProvider';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { colors } = useAppTheme();
  const iconMap: Record<string, any> = {
    index: 'home-outline',
    assets: 'wallet-outline',
    settings: 'settings-outline',
  };
  const iconFilled: Record<string, any> = {
    index: 'home',
    assets: 'wallet',
    settings: 'settings',
  };

  const iconName = focused ? (iconFilled[name] || 'ellipse-outline') : (iconMap[name] || 'ellipse-outline');

  return (
    <Ionicons
      name={iconName}
      size={22}
      color={focused ? colors.tabBarActive : colors.tabBarInactive}
    />
  );
}

function RootLayoutInner() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.parchment }]}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.ink,
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            height: 56,
            paddingBottom: 4,
            paddingTop: 4,
          },
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '首页',
            tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="index" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="assets"
          options={{
            title: '资产',
            tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="assets" focused={focused} />,
          }}
        />
        {/* 隐藏的旧页面 */}
        <Tabs.Screen name="investments" options={{ href: null }} />
        <Tabs.Screen name="import" options={{ href: null }} />
        <Tabs.Screen name="lock" options={{ href: null }} />
        <Tabs.Screen
          name="settings"
          options={{
            title: '设置',
            tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="settings" focused={focused} />,
          }}
        />
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
});
