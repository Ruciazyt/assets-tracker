// 资产页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AssetsScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  const loadAssets = async () => {
    const data = await AsyncStorage.getItem('@assets_tracker/assets');
    setAssets(data ? JSON.parse(data) : []);
  };

  useEffect(() => { loadAssets(); const interval = setInterval(loadAssets, 5000); return () => clearInterval(interval); }, []);

  const filteredAssets = assets.filter((a: any) => filter === 'all' || a.type === filter);
  const totalCash = assets.filter((a: any) => a.type === 'cash').reduce((sum: number, a: any) => sum + a.amount, 0);
  const totalFixed = assets.filter((a: any) => a.type === 'fixed').reduce((sum: number, a: any) => sum + a.amount, 0);

  const handleDelete = (id: string) => {
    Alert.alert('确认删除', '确定要删除这笔资产吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
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
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <SegmentedButtons value={filter} onValueChange={setFilter} buttons={[
          { value: 'all', label: `全部` },
          { value: 'cash', label: `流动资金` },
          { value: 'fixed', label: `固定资产` },
        ]} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredAssets.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyTitle}>暂无资产</Text><Text style={styles.emptyDesc}>点击下方按钮添加资产</Text></View>
        ) : filteredAssets.map((asset: any) => (
          <TouchableOpacity key={asset.id} onLongPress={() => handleDelete(asset.id)}>
            <Card style={styles.assetCard}>
              <Card.Content>
                <View style={styles.assetHeader}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetSubtype}>{getSubtypeLabel(asset)}</Text>
                </View>
                <Text style={styles.assetAmount}>{formatCurrency(asset.amount)}</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-asset')}>
        <Text style={styles.addButtonText}>+ 添加资产</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  filterRow: { padding: 16, backgroundColor: '#1a1a2e' },
  list: { flex: 1 },
  listContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { color: '#a0a0b0', fontSize: 14 },
  assetCard: { backgroundColor: '#252540', borderRadius: 12, marginBottom: 8 },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  assetSubtype: { color: '#6b6b7b', fontSize: 12 },
  assetAmount: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4 },
  addButton: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});