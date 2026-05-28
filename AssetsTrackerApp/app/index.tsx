// 首页 - 资产总览和当日盈亏

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';
import { getGoldPrice } from '../src/services/market/gold';
import { getJPYRate } from '../src/services/market/fx';
import { useExchangeRates } from '../src/hooks/useExchangeRates';
import { saveDailySnapshot } from '../src/services/historyService';

export default function HomeScreen() {
  const { colors } = useTheme();
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [jpyRate, setJpyRate] = useState<any>(null);
  const { rateMap, defaultCurrency, loading: ratesLoading, convertToDefault } = useExchangeRates();
  const [summary, setSummary] = useState({ totalAssets: 0, totalInvestments: 0, totalValue: 0, dailyPnl: 0, totalPnl: 0, totalValueConverted: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [assetsStr, investmentsStr] = await Promise.all([
        AsyncStorage.getItem('@assets_tracker/assets'),
        AsyncStorage.getItem('@assets_tracker/investments'),
      ]);
      const assets = assetsStr ? JSON.parse(assetsStr) : [];
      const investments = investmentsStr ? JSON.parse(investmentsStr) : [];
      const dailyPnl = investments.reduce((sum: number, i: any) => sum + (i.dailyPnl || 0), 0);
      const totalPnl = investments.reduce((sum: number, i: any) => sum + (i.totalPnl || 0), 0);
      const totalAssets = assets.reduce((sum: number, a: any) => sum + convertToDefault(a.amount, a.currency || 'CNY'), 0);
      const totalInvestments = investments.reduce((sum: number, i: any) => sum + convertToDefault(i.amount, i.currency || 'CNY'), 0);
      const totalValue = totalAssets + totalInvestments;
      setSummary({ totalAssets, totalInvestments, totalValue, dailyPnl, totalPnl, totalValueConverted: totalValue });

      // Fetch market data in parallel (graceful failure)
      const [gold, jpy] = await Promise.allSettled([
        getGoldPrice(),
        getJPYRate(),
      ]);
      if (gold.status === 'fulfilled' && gold.value) setGoldPrice(gold.value);
      if (jpy.status === 'fulfilled' && jpy.value) setJpyRate(jpy.value);

      // Save daily snapshot for trend tracking
      await saveDailySnapshot({
        goldPrice: gold.status === 'fulfilled' ? gold.value?.price : undefined,
        jpyRate: jpy.status === 'fulfilled' ? jpy.value?.rate : undefined,
        totalValue,
        totalDailyPnl: dailyPnl,
        totalPnl,
      });
    } catch (e) {
      console.error('Home fetchData error:', e);
    }
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      <Card style={[styles.card, styles.summaryCard, { backgroundColor: colors.accent }]}>
        <Text style={[styles.summaryLabel, { color: 'rgba(255,255,255,0.8)' }]}>总资产</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(summary.totalValue)}</Text>
        {defaultCurrency !== 'CNY' && !ratesLoading && (
          <Text style={[styles.summaryConverted, { color: 'rgba(255,255,255,0.7)' }]}>≈ {formatCurrency(summary.totalValueConverted)} ({defaultCurrency})</Text>
        )}
        <View style={styles.summaryRow}>
          <View><Text style={[styles.summaryItemLabel, { color: 'rgba(255,255,255,0.7)' }]}>流动资金</Text><Text style={styles.summaryItemValue}>{formatCurrency(summary.totalAssets)}</Text></View>
          <View><Text style={[styles.summaryItemLabel, { color: 'rgba(255,255,255,0.7)' }]}>理财产品</Text><Text style={styles.summaryItemValue}>{formatCurrency(summary.totalInvestments)}</Text></View>
        </View>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>今日盈亏</Text>
        <View style={styles.pnlRow}>
          <View style={styles.pnlItem}><Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>今日收益</Text><Text style={[styles.pnlValue, summary.dailyPnl >= 0 ? { color: colors.gain } : { color: colors.loss }]}>{formatCurrency(summary.dailyPnl)}</Text></View>
          <View style={styles.pnlItem}><Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>累计收益</Text><Text style={[styles.pnlValue, summary.totalPnl >= 0 ? { color: colors.gain } : { color: colors.loss }]}>{formatCurrency(summary.totalPnl)}</Text></View>
        </View>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>市场行情</Text>
        <View style={styles.quotesRow}>
          <View style={[styles.quoteCard, { backgroundColor: colors.cardSecondary }]}><Text style={[styles.quoteName, { color: colors.text }]}>黄金现货</Text><Text style={[styles.quotePrice, { color: colors.text }]}>{goldPrice ? goldPrice.price.toFixed(2) : '--'}</Text><Text style={[styles.quoteUnit, { color: colors.textMuted }]}>元/克</Text><Text style={[styles.quoteChange, goldPrice?.changePercent >= 0 ? { color: colors.gain } : { color: colors.loss }]}>{goldPrice ? formatPercent(goldPrice.changePercent) : '--'}</Text></View>
          <View style={[styles.quoteCard, { backgroundColor: colors.cardSecondary }]}><Text style={[styles.quoteName, { color: colors.text }]}>日元汇率</Text><Text style={[styles.quotePrice, { color: colors.text }]}>{jpyRate ? jpyRate.rate.toFixed(4) : '--'}</Text><Text style={[styles.quoteUnit, { color: colors.textMuted }]}>JPY/CNY</Text><Text style={[styles.quoteChange, { color: colors.textMuted }]}>--</Text></View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryCard: {},
  summaryLabel: { fontSize: 12 },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: '700', marginVertical: 4 },
  summaryRow: { flexDirection: 'row', marginTop: 24, gap: 24 },
  summaryItemLabel: { fontSize: 12 },
  summaryItemValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  summaryConverted: { fontSize: 14, marginTop: 4 },
  pnlRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pnlItem: { alignItems: 'center' },
  pnlLabel: { fontSize: 14 },
  pnlValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  quotesRow: { flexDirection: 'row', gap: 16 },
  quoteCard: { borderRadius: 8, padding: 16, minWidth: 120 },
  quoteName: { fontSize: 14, fontWeight: '500' },
  quotePrice: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  quoteUnit: { fontSize: 12 },
  quoteChange: { fontSize: 12, marginTop: 4 },
});