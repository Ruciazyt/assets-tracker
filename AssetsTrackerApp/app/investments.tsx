// 投资页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function InvestmentsScreen() {
  const router = useRouter();
  const [investments, setInvestments] = useState<any[]>([]);

  const loadData = async () => {
    const data = await AsyncStorage.getItem('@assets_tracker/investments');
    setInvestments(data ? JSON.parse(data) : []);
  };

  useEffect(() => { loadData(); const interval = setInterval(loadData, 30000); return () => clearInterval(interval); }, []);

  const totalValue = investments.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalDailyPnl = investments.reduce((sum: number, i: any) => sum + (i.dailyPnl || 0), 0);

  const handleDelete = (id: string) => {
    Alert.alert('确认删除', '确定要删除这笔投资吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const data = await AsyncStorage.getItem('@assets_tracker/investments');
        const arr = data ? JSON.parse(data) : [];
        const filtered = arr.filter((i: any) => i.id !== id);
        await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(filtered));
        loadData();
      }},
    ]);
  };

  const formatCurrency = (amount: number) => '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  const formatPercent = (value: number) => (value >= 0 ? '+' : '') + value.toFixed(2) + '%';

  const getSubtypeLabel = (inv: any) => {
    const map: Record<string, string> = { gold: '黄金', yuebao: '余额宝', fund: '基金', 'cn-stock': 'A股', 'hk-stock': '港股' };
    return map[inv.subtype] || inv.subtype;
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}><Text style={styles.summaryLabel}>总市值</Text><Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryLabel}>今日盈亏</Text><Text style={[styles.summaryValue, totalDailyPnl >= 0 ? styles.gain : styles.loss]}>{formatCurrency(totalDailyPnl)}</Text></View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {investments.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyTitle}>暂无投资</Text><Text style={styles.emptyDesc}>点击下方按钮添加理财产品</Text></View>
        ) : investments.map((inv: any) => (
          <TouchableOpacity key={inv.id} onLongPress={() => handleDelete(inv.id)}>
            <Card style={styles.invCard}>
              <Card.Content>
                <View style={styles.invHeader}>
                  <Text style={styles.invName}>{inv.name}</Text>
                  <Text style={styles.invSubtype}>{getSubtypeLabel(inv)}</Text>
                </View>
                <View style={styles.invRow}>
                  <View><Text style={styles.invLabel}>当前市值</Text><Text style={styles.invAmount}>{formatCurrency(inv.amount)}</Text></View>
                  <View><Text style={styles.invLabel}>今日盈亏</Text><Text style={[styles.invPnl, inv.dailyPnl >= 0 ? styles.gain : styles.loss]}>{formatCurrency(inv.dailyPnl)} ({formatPercent(inv.dailyReturn)})</Text></View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-investment')}>
        <Text style={styles.addButtonText}>+ 添加投资</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  summaryRow: { flexDirection: 'row', padding: 16, backgroundColor: '#1a1a2e' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: '#a0a0b0', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 20, fontWeight: '600', marginTop: 2 },
  gain: { color: '#22c55e' },
  loss: { color: '#ef4444' },
  list: { flex: 1 },
  listContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { color: '#a0a0b0', fontSize: 14 },
  invCard: { backgroundColor: '#252540', borderRadius: 12, marginBottom: 8 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  invSubtype: { color: '#6b6b7b', fontSize: 12, backgroundColor: '#1a1a2e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  invRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  invLabel: { color: '#a0a0b0', fontSize: 14 },
  invAmount: { color: '#fff', fontSize: 16, fontWeight: '600' },
  invPnl: { fontSize: 14, fontWeight: '500' },
  addButton: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});