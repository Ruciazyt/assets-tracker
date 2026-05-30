// 投资页面 — 已合并到 assets.tsx，此页面自动跳转

import { useEffect } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function InvestmentsScreen() {
  useEffect(() => {
    router.replace('/assets');
  }, []);
  return <View style={{ flex: 1 }} />;
}
