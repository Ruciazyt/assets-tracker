// 投资页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';

import { recalculateAllInvestments } from '../src/services/profitCalculator';

const UPDATE_KEY = '@assets_tracker/profit_updates';

export default function InvestmentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [investments, setInvestments] = useState<any[]>([]);

  const recalculateAndMerge = async (data: any[]) => {
    if (!data.length) return data;
    try {
      const updates = await recalculateAllInvestments(data);
      const updateMap: Record<string, any> = {};
      for (const u of updates) {
        updateMap[u.id] = u;
      }
      return data.map((inv: any) => {
        const u = updateMap[inv.id];
        if (!u) return inv;
        return {
          ...inv,
          newPrice: u.newPrice,
          dailyPnl: u.dailyPnl,
          dailyReturn: u.dailyReturn,
          totalPnl: u.totalPnl,
        };
      });
    } catch (e) {
      console.error('[investments] recalculate error:', e);
      return data;
    }
  };

  const loadData = async () => {
    const raw = await AsyncStorage.getItem('@assets_tracker/investments');
    const data = raw ? JSON.parse(raw) : [];
    const updated = await recalculateAndMerge(data);
    setInvestments(updated);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.summaryRow, { backgroundColor: colors.tabBar }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>总市值</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalValue)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>今日盈亏</Text>
          <Text style={[styles.summaryValue, { color: totalDailyPnl >= 0 ? colors.gain : colors.loss }]}>{formatCurrency(totalDailyPnl)}</Text>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {investments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无投资</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>点击下方按钮添加理财产品</Text>
          </View>
        ) : investments.map((inv: any) => (
          <TouchableOpacity key={inv.id} onLongPress={() => handleDelete(inv.id)}>
            <Card style={[styles.invCard, { backgroundColor: colors.card }]}>
              <Card.Content>
                <View style={styles.invHeader}>
                  <Text style={[styles.invName, { color: colors.text }]}>{inv.name}</Text>
                  <Text style={[styles.invSubtype, { color: colors.textMuted, backgroundColor: colors.cardSecondary }]}>{getSubtypeLabel(inv)}</Text>
                </View>
                <View style={styles.invRow}>
                  <View>
                    <Text style={[styles.invLabel, { color: colors.textSecondary }]}>当前市值</Text>
                    <Text style={[styles.invAmount, { color: colors.text }]}>{formatCurrency(inv.amount)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.invLabel, { color: colors.textSecondary }]}>今日盈亏</Text>
                    <Text style={[styles.invPnl, { color: inv.dailyPnl >= 0 ? colors.gain : colors.loss }]}>{formatCurrency(inv.dailyPnl)} ({formatPercent(inv.dailyReturn)})</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => router.push('/add-investment')}>
        <Text style={[styles.addButtonText, { color: colors.accentText }]}>+ 添加投资</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 20, fontWeight: '600', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
  invCard: { borderRadius: 12, marginBottom: 8 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invName: { fontSize: 16, fontWeight: '600' },
  invSubtype: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  invRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  invLabel: { fontSize: 14 },
  invAmount: { fontSize: 16, fontWeight: '600' },
  invPnl: { fontSize: 14, fontWeight: '500' },
  addButton: { position: 'absolute', bottom: 24, right: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  addButtonText: { fontSize: 16, fontWeight: '600' },
});