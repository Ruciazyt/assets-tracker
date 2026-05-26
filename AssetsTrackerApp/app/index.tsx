// 首页 - 资产总览和当日盈亏

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [jpyRate, setJpyRate] = useState<any>(null);
  const [summary, setSummary] = useState({ totalAssets: 0, totalInvestments: 0, totalValue: 0, dailyPnl: 0, totalPnl: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [assetsStr, investmentsStr] = await Promise.all([
        AsyncStorage.getItem('@assets_tracker/assets'),
        AsyncStorage.getItem('@assets_tracker/investments'),
      ]);
      const assets = assetsStr ? JSON.parse(assetsStr) : [];
      const investments = investmentsStr ? JSON.parse(investmentsStr) : [];
      const totalAssets = assets.reduce((sum: number, a: any) => sum + a.amount, 0);
      const totalInvestments = investments.reduce((sum: number, i: any) => sum + i.amount, 0);
      const dailyPnl = investments.reduce((sum: number, i: any) => sum + (i.dailyPnl || 0), 0);
      const totalPnl = investments.reduce((sum: number, i: any) => sum + (i.totalPnl || 0), 0);
      setSummary({ totalAssets, totalInvestments, totalValue: totalAssets + totalInvestments, dailyPnl, totalPnl });
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const formatCurrency = (amount: number) => '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPercent = (value: number) => (value >= 0 ? '+' : '') + value.toFixed(2) + '%';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}>
      <Card style={[styles.card, styles.summaryCard]}>
        <Text style={styles.summaryLabel}>总资产</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(summary.totalValue)}</Text>
        <View style={styles.summaryRow}>
          <View><Text style={styles.summaryItemLabel}>流动资金</Text><Text style={styles.summaryItemValue}>{formatCurrency(summary.totalAssets)}</Text></View>
          <View><Text style={styles.summaryItemLabel}>理财产品</Text><Text style={styles.summaryItemValue}>{formatCurrency(summary.totalInvestments)}</Text></View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>今日盈亏</Text>
        <View style={styles.pnlRow}>
          <View style={styles.pnlItem}><Text style={styles.pnlLabel}>今日收益</Text><Text style={[styles.pnlValue, summary.dailyPnl >= 0 ? styles.gain : styles.loss]}>{formatCurrency(summary.dailyPnl)}</Text></View>
          <View style={styles.pnlItem}><Text style={styles.pnlLabel}>累计收益</Text><Text style={[styles.pnlValue, summary.totalPnl >= 0 ? styles.gain : styles.loss]}>{formatCurrency(summary.totalPnl)}</Text></View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>市场行情</Text>
        <View style={styles.quotesRow}>
          <View style={styles.quoteCard}><Text style={styles.quoteName}>黄金现货</Text><Text style={styles.quotePrice}>{goldPrice ? goldPrice.price.toFixed(2) : '--'}</Text><Text style={styles.quoteUnit}>元/克</Text><Text style={[styles.quoteChange, goldPrice?.changePercent >= 0 ? styles.gain : styles.loss]}>{goldPrice ? formatPercent(goldPrice.changePercent) : '--'}</Text></View>
          <View style={styles.quoteCard}><Text style={styles.quoteName}>日元汇率</Text><Text style={styles.quotePrice}>{jpyRate ? jpyRate.rate.toFixed(4) : '--'}</Text><Text style={styles.quoteUnit}>JPY/CNY</Text><Text style={styles.quoteChange}>--</Text></View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16 },
  card: { backgroundColor: '#252540', borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryCard: { backgroundColor: '#6366f1' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: '700', marginVertical: 4 },
  summaryRow: { flexDirection: 'row', marginTop: 24, gap: 24 },
  summaryItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryItemValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  pnlRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pnlItem: { alignItems: 'center' },
  pnlLabel: { color: '#a0a0b0', fontSize: 14 },
  pnlValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  gain: { color: '#22c55e' },
  loss: { color: '#ef4444' },
  quotesRow: { flexDirection: 'row', gap: 16 },
  quoteCard: { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 16, minWidth: 120 },
  quoteName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  quotePrice: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  quoteUnit: { color: '#6b6b7b', fontSize: 12 },
  quoteChange: { fontSize: 12, marginTop: 4 },
});