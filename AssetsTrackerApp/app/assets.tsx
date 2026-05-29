// 资产页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from '../src/i18n/LanguageContext';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';

export default function AssetsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  const loadAssets = async () => {
    const data = await AsyncStorage.getItem('@assets_tracker/assets');
    setAssets(data ? JSON.parse(data) : []);
  };

  useEffect(() => { loadAssets(); }, []);
  useAutoRefresh(loadAssets);

  const filteredAssets = assets.filter((a: any) => filter === 'all' || a.type === filter);
  const totalCash = assets.filter((a: any) => a.type === 'cash').reduce((sum: number, a: any) => sum + a.amount, 0);
  const totalFixed = assets.filter((a: any) => a.type === 'fixed').reduce((sum: number, a: any) => sum + a.amount, 0);

  const handleDelete = (id: string) => {
    Alert.alert(t('common.deleteConfirm'), t('common.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        const data = await AsyncStorage.getItem('@assets_tracker/assets');
        const arr = data ? JSON.parse(data) : [];
        const filtered = arr.filter((a: any) => a.id !== id);
        await AsyncStorage.setItem('@assets_tracker/assets', JSON.stringify(filtered));
        loadAssets();
      }},
    ]);
  };

  const formatCurrency = (amount: number) => '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

  const getSubtypeLabel = (asset: any) => {
    const map: Record<string, string> = { cash: '现金', bank: '银行存款', alipay: '支付宝', wechat: '微信', property: '房产', vehicle: '车辆', equipment: '设备' };
    return map[asset.subtype] || asset.subtype;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.filterRow, { backgroundColor: colors.tabBar }]}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: t('common.all') + ' ' },
            { value: 'cash', label: t('home.liquidAssets') },
            { value: 'fixed', label: t('assets.title') },
          ]}
        />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredAssets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无资产</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>点击下方按钮添加资产</Text>
          </View>
        ) : filteredAssets.map((asset: any) => (
          <TouchableOpacity key={asset.id} onLongPress={() => handleDelete(asset.id)}>
            <Card style={[styles.assetCard, { backgroundColor: colors.card }]}>
              <Card.Content>
                <View style={styles.assetHeader}>
                  <Text style={[styles.assetName, { color: colors.text }]}>{asset.name}</Text>
                  <Text style={[styles.assetSubtype, { color: colors.textMuted }]}>{getSubtypeLabel(asset)}</Text>
                </View>
                <Text style={[styles.assetAmount, { color: colors.text }]}>{formatCurrency(asset.amount)}</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => router.push('/add-asset')}>
        <Text style={[styles.addButtonText, { color: colors.accentText }]}>+ 添加资产</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { padding: 16 },
  list: { flex: 1 },
  listContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
  assetCard: { borderRadius: 12, marginBottom: 8 },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetName: { fontSize: 16, fontWeight: '600' },
  assetSubtype: { fontSize: 12 },
  assetAmount: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  addButton: { position: 'absolute', bottom: 24, right: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  addButtonText: { fontSize: 16, fontWeight: '600' },
});