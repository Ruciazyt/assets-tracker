// 首页 — Apple 风格 Dashboard
// 总资产 + 今日盈亏 + 市场行情 + 趋势图

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import SectionHeader from '../src/components/SectionHeader';
import SegmentedControl from '../src/components/SegmentedControl';
import { getGoldPrice } from '../src/services/market/gold';
import { saveDailySnapshot, getHistory } from '../src/services/historyService';

// ── 趋势图组件 ──

type TrendMetric = 'totalValue' | 'totalPnl' | 'totalDailyPnl';

interface TrendChartProps {
  data: any[];
  metric: TrendMetric;
}

function TrendChart({ data, metric }: TrendChartProps) {
  const { colors } = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const chartWidth = 320;
  const chartHeight = 160;
  const leftPadding = 44;
  const rightPadding = 16;
  const topPadding = 16;
  const bottomPadding = 24;
  const tooltipHeight = 52;
  const tooltipWidth = 110;

  const values = data.map(d => d[metric]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const isPnl = metric !== 'totalValue';

  const graphWidth = chartWidth - leftPadding - rightPadding;
  const graphHeight = chartHeight - topPadding - bottomPadding;

  const pointCoords = data.map((d, i) => ({
    x: leftPadding + (i / (data.length - 1)) * graphWidth,
    y: topPadding + graphHeight - ((d[metric] - minVal) / range) * graphHeight,
  }));

  const points = pointCoords.map(p => `${p.x},${p.y}`).join(' ');
  const lineColor = isPnl
    ? (data[data.length - 1]?.[metric] >= 0 ? colors.gain : colors.loss)
    : colors.primary;

  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal];
  const formatYLabel = (val: number) => {
    if (isPnl) {
      const sign = val >= 0 ? '+' : '';
      return Math.abs(val) >= 10000 ? sign + (val / 10000).toFixed(1) + '万' : sign + val.toFixed(0);
    }
    return val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toFixed(0);
  };

  const selectedData = selectedIndex !== null ? data[selectedIndex] : null;
  const formatTooltipValue = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return '¥' + sign + val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTooltipStyle = (): ViewStyle => {
    if (selectedIndex === null) return {};
    const p = pointCoords[selectedIndex];
    let left = p.x - tooltipWidth / 2;
    if (left < 0) left = 0;
    if (left + tooltipWidth > chartWidth) left = chartWidth - tooltipWidth;
    const top = Math.max(0, p.y - tooltipHeight - 16);
    return { left, top };
  };

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <Svg width={chartWidth} height={chartHeight}>
          {yLabels.map((val, i) => {
            const y = topPadding + graphHeight - (i / 2) * graphHeight;
            return (
              <SvgText key={i} x={leftPadding - 8} y={y + 4} fontSize={10}
                fill={colors.textMuted} textAnchor="end">
                {formatYLabel(val)}
              </SvgText>
            );
          })}
          <Polyline points={points} fill="none" stroke={lineColor} strokeWidth={2} />
          {pointCoords.map((coord, i) => {
            const isSelected = selectedIndex === i;
            const pointValue = data[i][metric];
            const pointColor = isPnl ? (pointValue >= 0 ? colors.gain : colors.loss) : colors.primary;
            return (
              <TouchableOpacity key={i} activeOpacity={0.7}
                onPress={() => {
                  if (selectedIndex === i) setSelectedIndex(null);
                  else { setSelectedIndex(i); setTooltipPos({ x: coord.x, y: coord.y }); }
                }}
                style={{ position: 'absolute', left: coord.x - 12, top: coord.y - 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Circle cx={12} cy={12} r={isSelected ? 6 : 4}
                  fill={isSelected ? pointColor : colors.canvas}
                  stroke={pointColor} strokeWidth={isSelected ? 2 : 1.5} />
              </TouchableOpacity>
            );
          })}
        </Svg>

        {selectedData && (
          <View style={[{ position: 'absolute', alignItems: 'center', zIndex: 10 }, getTooltipStyle()]}>
            <View style={{ width: tooltipWidth, height: tooltipHeight, borderRadius: 8,
              backgroundColor: colors.ink, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{selectedData.date.slice(5)}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: lineColor }}>{formatTooltipValue(selectedData[metric])}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: leftPadding, paddingRight: rightPadding }}>
        {data.map((d, i) => (
          <Text key={i} style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center' }}>
            {(data.length <= 7 || i === 0 || i === data.length - 1) ? d.date.slice(5) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── 首页主组件 ──

export default function HomeScreen() {
  const { colors, spacing, radius, typography, shadows } = useAppTheme();
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [summary, setSummary] = useState({ totalAssets: 0, totalInvestments: 0, totalValue: 0, dailyPnl: 0, totalPnl: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [historyDays, setHistoryDays] = useState<7 | 30>(7);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('totalValue');

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
      const totalAssets = assets.reduce((sum: number, a: any) => sum + a.amount, 0);
      const totalInvestments = investments.reduce((sum: number, i: any) => sum + i.amount, 0);
      const totalValue = totalAssets + totalInvestments;

      setSummary({ totalAssets, totalInvestments, totalValue, dailyPnl, totalPnl });

      const gold = await getGoldPrice();
      if (gold) setGoldPrice(gold);

      await saveDailySnapshot({
        goldPrice: gold?.price,
        totalValue,
        totalDailyPnl: dailyPnl,
        totalPnl,
      });

      const history = await getHistory(historyDays);
      setHistoryData(history);
    } catch (e) {
      console.error('Home fetchData error:', e);
    }
  }, [historyDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const formatCurrency = (amount: number) => '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPercent = (value: number) => (value >= 0 ? '+' : '') + value.toFixed(2) + '%';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.parchment }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ── 总资产卡片 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md, backgroundColor: colors.ink }}>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>总资产</Text>
        <Text style={[typography.displayLg, { color: colors.canvas, marginTop: spacing.xxs }]}>
          {formatCurrency(summary.totalValue)}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: spacing.lg, gap: spacing.xxl }}>
          <View>
            <Text style={[typography.finePrint, { color: 'rgba(255,255,255,0.6)' }]}>流动资金</Text>
            <Text style={[typography.bodyStrong, { color: colors.canvas, marginTop: 2 }]}>{formatCurrency(summary.totalAssets)}</Text>
          </View>
          <View>
            <Text style={[typography.finePrint, { color: 'rgba(255,255,255,0.6)' }]}>投资理财</Text>
            <Text style={[typography.bodyStrong, { color: colors.canvas, marginTop: 2 }]}>{formatCurrency(summary.totalInvestments)}</Text>
          </View>
        </View>
      </AppleCard>

      {/* ── 今日盈亏 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <Text style={[typography.bodyStrong, { color: colors.ink, marginBottom: spacing.sm }]}>盈亏</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>今日盈亏</Text>
            <Text style={[typography.tagline, { color: summary.dailyPnl >= 0 ? colors.gain : colors.loss, marginTop: 4 }]}>
              {formatCurrency(summary.dailyPnl)}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>累计收益</Text>
            <Text style={[typography.tagline, { color: summary.totalPnl >= 0 ? colors.gain : colors.loss, marginTop: 4 }]}>
              {formatCurrency(summary.totalPnl)}
            </Text>
          </View>
        </View>
      </AppleCard>

      {/* ── 市场行情 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <Text style={[typography.bodyStrong, { color: colors.ink, marginBottom: spacing.sm }]}>市场行情</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{
            flex: 1, backgroundColor: colors.parchment, borderRadius: radius.md,
            padding: spacing.md, alignItems: 'center',
          }}>
            <Text style={[typography.caption, { color: colors.ink }]}>黄金现货</Text>
            <Text style={[typography.tagline, { color: colors.ink, marginTop: 4 }]}>
              {goldPrice ? goldPrice.price.toFixed(2) : '--'}
            </Text>
            <Text style={[typography.finePrint, { color: colors.textMuted, marginTop: 2 }]}>元/克</Text>
            <Text style={[typography.caption, {
              color: goldPrice?.changePercent >= 0 ? colors.gain : colors.loss, marginTop: 4,
            }]}>
              {goldPrice ? formatPercent(goldPrice.changePercent) : '--'}
            </Text>
          </View>
        </View>
      </AppleCard>

      {/* ── 趋势图 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={[typography.bodyStrong, { color: colors.ink }]}>趋势</Text>
        </View>

        {/* 时间区间 */}
        <SegmentedControl
          segments={[
            { label: '7天', value: '7' },
            { label: '30天', value: '30' },
          ]}
          selected={String(historyDays)}
          onValueChange={v => setHistoryDays(Number(v) as 7 | 30)}
          style={{ marginBottom: spacing.sm }}
        />

        {/* 指标切换 */}
        <SegmentedControl
          segments={[
            { label: '资产值', value: 'totalValue' },
            { label: '累计收益', value: 'totalPnl' },
            { label: '日收益', value: 'totalDailyPnl' },
          ]}
          selected={trendMetric}
          onValueChange={v => setTrendMetric(v as TrendMetric)}
        />

        {historyData.length < 2 ? (
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl }]}>
            暂无趋势数据
          </Text>
        ) : (
          <TrendChart data={historyData} metric={trendMetric} />
        )}
      </AppleCard>
    </ScrollView>
  );
}
