// 投资页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from '../src/i18n/LanguageContext';

import { recalculateAllInvestments } from '../src/services/profitCalculator';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 180;
const CHART_PADDING = 32;

export default function InvestmentsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
      const updated = data.map((inv: any) => {
        const u = updateMap[inv.id];
        if (!u) return inv;
        const result: any = {
          ...inv,
          newPrice: u.newPrice,
          dailyPnl: u.dailyPnl,
          dailyReturn: u.dailyReturn,
          totalPnl: u.totalPnl,
        };
        // Persist lastPrice so next refresh uses it as "yesterday close"
        if (u.newLastPrice > 0) {
          result.lastPrice = u.newLastPrice;
        }
        return result;
      });
      // Write updated lastPrice back to AsyncStorage
      await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(updated));
      return updated;
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

  useEffect(() => { loadData(); }, []);
  useAutoRefresh(loadData);

  const totalValue = investments.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalDailyPnl = investments.reduce((sum: number, i: any) => sum + (i.dailyPnl || 0), 0);

  const handleDelete = (id: string) => {
    Alert.alert(t('common.deleteConfirm'), t('common.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
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

  // Chart rendering with interactive tooltips
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const renderChart = () => {
    if (investments.length === 0) return null;

    const pnlData = investments
      .map((inv: any, idx: number) => ({ name: inv.name.slice(0, 4), pnl: inv.totalPnl || 0, fullName: inv.name, idx }))
      .filter(d => d.pnl !== 0);

    if (pnlData.length === 0) return null;

    const maxAbs = Math.max(...pnlData.map(d => Math.abs(d.pnl)));
    const chartW = SCREEN_WIDTH - 64;
    const barW = Math.min(40, (chartW - CHART_PADDING * 2) / pnlData.length - 8);
    const zeroY = CHART_HEIGHT * 0.6;
    const tooltipH = 52;
    const tooltipArrowH = 6;

    return (
      <Card style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📊 {t('investments.pnlChart')}</Text>
        <View style={{ position: 'relative' }}>
          <Svg width={chartW} height={CHART_HEIGHT}>
            {/* Zero line */}
            <Line x1={CHART_PADDING - 8} y1={zeroY} x2={chartW - 8} y2={zeroY} stroke={colors.border} strokeWidth={1} />
            {/* Zero label */}
            <SvgText
              x={CHART_PADDING - 12}
              y={zeroY + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
            >0</SvgText>
            {pnlData.map((d: any, i: number) => {
              const absH = maxAbs > 0 ? (Math.abs(d.pnl) / maxAbs) * (CHART_HEIGHT * 0.45) : 0;
              const barCenterX = CHART_PADDING + i * ((chartW - CHART_PADDING * 2) / pnlData.length) + (((chartW - CHART_PADDING * 2) / pnlData.length)) / 2;
              const barX = barCenterX - barW / 2;
              const barY = d.pnl >= 0 ? zeroY - absH : zeroY;
              const barColor = d.pnl >= 0 ? colors.gain : colors.loss;
              const labelY = d.pnl >= 0 ? zeroY + 12 : zeroY - absH - 4;
              const isSelected = selectedBar === i;

              return (
                <React.Fragment key={i}>
                  {/* Invisible touch target on top of bar */}
                  <Rect
                    x={barX}
                    y={0}
                    width={barW}
                    height={CHART_HEIGHT}
                    fill="transparent"
                    onPress={() => setSelectedBar(isSelected ? null : i)}
                  />
                  <Rect
                    x={barX}
                    y={barY}
                    width={barW}
                    height={absH}
                    rx={4}
                    fill={isSelected ? barColor : barColor + (isSelected ? '' : '99')}
                    stroke={isSelected ? colors.text : 'transparent'}
                    strokeWidth={isSelected ? 1.5 : 0}
                  />
                  <SvgText
                    x={barCenterX}
                    y={labelY}
                    fontSize={9}
                    fill={colors.textMuted}
                    textAnchor="middle"
                  >
                    {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(0)}
                  </SvgText>
                  <SvgText
                    x={barCenterX}
                    y={CHART_HEIGHT - 4}
                    fontSize={9}
                    fill={colors.textMuted}
                    textAnchor="middle"
                  >
                    {d.name}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Bar tooltip */}
          {selectedBar !== null && (() => {
            const d = pnlData[selectedBar];
            const barCenterX = CHART_PADDING + selectedBar * ((chartW - CHART_PADDING * 2) / pnlData.length) + (((chartW - CHART_PADDING * 2) / pnlData.length)) / 2;
            const absH = maxAbs > 0 ? (Math.abs(d.pnl) / maxAbs) * (CHART_HEIGHT * 0.45) : 0;
            const barY = d.pnl >= 0 ? zeroY - absH : zeroY;
            // Tooltip sits above the bar
            const tooltipW = 120;
            let tooltipX = barCenterX - tooltipW / 2;
            if (tooltipX < 0) tooltipX = 0;
            if (tooltipX + tooltipW > chartW) tooltipX = chartW - tooltipW;
            const tooltipY = Math.max(0, barY - tooltipH - tooltipArrowH - 4);
            return (
              <View style={[styles.barTooltip, { left: tooltipX, top: tooltipY }]}>
                <View style={[styles.barTooltipContent, { backgroundColor: colors.text, borderColor: d.pnl >= 0 ? colors.gain : colors.loss }]}>
                  <Text style={[styles.barTooltipName, { color: colors.textMuted }]} numberOfLines={1}>{d.fullName}</Text>
                  <Text style={[styles.barTooltipValue, { color: d.pnl >= 0 ? colors.gain : colors.loss }]}>
                    {d.pnl >= 0 ? '+' : ''}{formatCurrency(d.pnl)}
                  </Text>
                </View>
                <View style={[styles.barTooltipArrow, { borderTopColor: colors.text, left: barCenterX - tooltipX - 5 }]} />
              </View>
            );
          })()}
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.summaryRow, { backgroundColor: colors.tabBar }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('investments.totalValue')}</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalValue)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('home.dailyPnl')}</Text>
          <Text style={[styles.summaryValue, { color: totalDailyPnl >= 0 ? colors.gain : colors.loss }]}>{formatCurrency(totalDailyPnl)}</Text>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {renderChart()}

        {investments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('investments.noData')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('investments.addHint')}</Text>
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
                    <Text style={[styles.invLabel, { color: colors.textSecondary }]}>{t('investments.currentPrice')}</Text>
                    <Text style={[styles.invAmount, { color: colors.text }]}>{formatCurrency(inv.newPrice)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.invLabel, { color: colors.textSecondary }]}>{t('investments.dailyChange')}</Text>
                    <Text style={[styles.invPnl, { color: (inv.dailyReturn || 0) >= 0 ? colors.gain : colors.loss }]}>
                      {formatPercent(inv.dailyReturn || 0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.invLabel, { color: colors.textSecondary }]}>{t('investments.totalPnl')}</Text>
                    <Text style={[styles.invPnl, { color: (inv.totalPnl || 0) >= 0 ? colors.gain : colors.loss }]}>
                      {formatCurrency(inv.totalPnl || 0)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => router.push('/add-investment')}>
        <Text style={[styles.addButtonText, { color: colors.accentText }]}>+ {t('investments.add')}</Text>
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
  chartCard: { borderRadius: 12, marginBottom: 12, padding: 12, alignItems: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, alignSelf: 'flex-start' },
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
  barTooltip: { position: 'absolute', width: 120, alignItems: 'center', zIndex: 10 },
  barTooltipContent: {
    width: 120,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  barTooltipName: { fontSize: 10, marginBottom: 2 },
  barTooltipValue: { fontSize: 13, fontWeight: '600' },
  barTooltipArrow: {
    position: 'absolute',
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});