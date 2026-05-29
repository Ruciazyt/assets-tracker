// 首页 - 资产总览和当日盈亏

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, LayoutChangeEvent, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from '../src/i18n/LanguageContext';
import { getGoldPrice } from '../src/services/market/gold';
import { getJPYRate } from '../src/services/market/fx';
import { useExchangeRates } from '../src/hooks/useExchangeRates';
import { saveDailySnapshot, getHistory } from '../src/services/historyService';

// 趋势图组件
interface TrendChartProps {
  data: any[];
  colors: any;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  value: number;
}

function TrendChart({ data, colors }: TrendChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const containerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const chartWidth = 300; // 可根据容器调整
  const chartHeight = 160;
  const leftPadding = 40;
  const rightPadding = 16;
  const topPadding = 16;
  const bottomPadding = 24;
  const tooltipOffset = 12; // tooltip与数据点的垂直间距
  const tooltipArrowHeight = 6;
  const tooltipWidth = 110;
  const tooltipHeight = 52;

  const values = data.map(d => d.totalValue);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // 计算Y轴标签
  const formatYLabel = (val: number) => {
    if (val >= 10000) {
      return (val / 10000).toFixed(1) + '万';
    }
    return val.toFixed(0);
  };

  // 生成Y轴标签值
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal];

  // 计算点位置
  const graphWidth = chartWidth - leftPadding - rightPadding;
  const graphHeight = chartHeight - topPadding - bottomPadding;

  // 计算每个点的精确坐标
  const pointCoords = data.map((d, i) => {
    const x = leftPadding + (i / (data.length - 1)) * graphWidth;
    const y = topPadding + graphHeight - ((d.totalValue - minVal) / range) * graphHeight;
    return { x, y };
  });

  const points = pointCoords.map(p => `${p.x},${p.y}`).join(' ');

  // X轴日期标签（MM-DD）
  const xLabels = data.map((d, i) => {
    if (data.length <= 7 || i === 0 || i === data.length - 1) {
      return d.date.slice(5); // MM-DD
    }
    return '';
  });

  const handlePointPress = (index: number) => {
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
      setTooltipPos({ x: pointCoords[index].x, y: pointCoords[index].y });
    }
  };

  // 计算tooltip位置，确保不超出边界
  const getTooltipStyle = (): ViewStyle => {
    let left = tooltipPos.x - tooltipWidth / 2;
    // 水平边界检测
    if (left < 0) left = 0;
    if (left + tooltipWidth > chartWidth) left = chartWidth - tooltipWidth;

    // tooltip在点上方，所以y坐标是点的y - tooltipHeight - tooltipOffset
    const top = tooltipPos.y - tooltipHeight - tooltipOffset - tooltipArrowHeight;

    return {
      left,
      top: Math.max(0, top),
    };
  };

  const selectedData = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <View ref={containerRef}>
      <View style={{ position: 'relative' }}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y轴标签 */}
          {yLabels.map((val, i) => {
            const y = topPadding + graphHeight - (i / 2) * graphHeight;
            return (
              <React.Fragment key={i}>
                <SvgText
                  x={leftPadding - 8}
                  y={y + 4}
                  fontSize={10}
                  fill={colors.textMuted}
                  textAnchor="end"
                >
                  {formatYLabel(val)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {/* 折线 */}
          <Polyline
            points={points}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
          />
          {/* 数据点 */}
          {pointCoords.map((coord, i) => {
            const isSelected = selectedIndex === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => handlePointPress(i)}
                style={{ position: 'absolute', left: coord.x - 12, top: coord.y - 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}
              >
                <Circle
                  cx={12}
                  cy={12}
                  r={isSelected ? 8 : 4}
                  fill={isSelected ? colors.accent : colors.cardSecondary}
                  stroke={colors.accent}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
              </TouchableOpacity>
            );
          })}
        </Svg>

        {/* Tooltip */}
        {selectedData && (
          <View style={[styles.tooltipContainer, getTooltipStyle()]}>
            <View style={[styles.tooltipContent, { backgroundColor: colors.text, borderColor: colors.accent }]}>
              <Text style={[styles.tooltipDate, { color: colors.textMuted }]}>
                {selectedData.date.slice(5)}
              </Text>
              <Text style={[styles.tooltipValue, { color: colors.accent }]}>
                ¥{selectedData.totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            {/* 下方小三角指示器 */}
            <View style={[styles.tooltipArrow, { borderTopColor: colors.text }]} />
          </View>
        )}
      </View>

      {/* X轴日期标签 */}
      <View style={[styles.xLabels, { paddingLeft: leftPadding, paddingRight: rightPadding }]}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.xLabel, { color: colors.textMuted }]}>
            {xLabels[i]}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [jpyRate, setJpyRate] = useState<any>(null);
  const { rateMap, defaultCurrency, loading: ratesLoading, convertToDefault } = useExchangeRates();
  const [summary, setSummary] = useState({ totalAssets: 0, totalInvestments: 0, totalValue: 0, dailyPnl: 0, totalPnl: 0, totalValueConverted: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [historyDays, setHistoryDays] = useState<7 | 30>(7);
  const [historyData, setHistoryData] = useState<any[]>([]);

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

      // Load history data for trend chart
      const history = await getHistory(historyDays);
      setHistoryData(history);
    } catch (e) {
      console.error('Home fetchData error:', e);
    }
  }, [historyDays]);

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
        <Text style={[styles.summaryLabel, { color: 'rgba(255,255,255,0.8)' }]}>{t('home.totalAssets')}</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(summary.totalValue)}</Text>
        {defaultCurrency !== 'CNY' && !ratesLoading && (
          <Text style={[styles.summaryConverted, { color: 'rgba(255,255,255,0.7)' }]}>≈ {formatCurrency(summary.totalValueConverted)} ({defaultCurrency})</Text>
        )}
        <View style={styles.summaryRow}>
          <View><Text style={[styles.summaryItemLabel, { color: 'rgba(255,255,255,0.7)' }]}>{t('home.liquidAssets')}</Text><Text style={styles.summaryItemValue}>{formatCurrency(summary.totalAssets)}</Text></View>
          <View><Text style={[styles.summaryItemLabel, { color: 'rgba(255,255,255,0.7)' }]}>{t('home.investments')}</Text><Text style={styles.summaryItemValue}>{formatCurrency(summary.totalInvestments)}</Text></View>
        </View>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.dailyPnl')}</Text>
        <View style={styles.pnlRow}>
          <View style={styles.pnlItem}><Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>{t('home.dailyPnl')}</Text><Text style={[styles.pnlValue, summary.dailyPnl >= 0 ? { color: colors.gain } : { color: colors.loss }]}>{formatCurrency(summary.dailyPnl)}</Text></View>
          <View style={styles.pnlItem}><Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>{t('home.totalPnl')}</Text><Text style={[styles.pnlValue, summary.totalPnl >= 0 ? { color: colors.gain } : { color: colors.loss }]}>{formatCurrency(summary.totalPnl)}</Text></View>
        </View>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.market')}</Text>
        <View style={styles.quotesRow}>
          <View style={[styles.quoteCard, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.quoteName, { color: colors.text }]}>{t('home.gold')}</Text>
            <Text style={[styles.quotePrice, { color: colors.text }]}>{goldPrice ? goldPrice.price.toFixed(2) : '--'}</Text>
            <Text style={[styles.quoteUnit, { color: colors.textMuted }]}>元/克</Text>
            <Text style={[styles.quoteChange, goldPrice?.changePercent >= 0 ? { color: colors.gain } : { color: colors.loss }]}>{goldPrice ? formatPercent(goldPrice.changePercent) : '--'}</Text>
          </View>
          <View style={[styles.quoteCard, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.quoteName, { color: colors.text }]}>{t('home.jpy')}</Text>
            <Text style={[styles.quotePrice, { color: colors.text }]}>{jpyRate ? jpyRate.rate.toFixed(4) : '--'}</Text>
            <Text style={[styles.quoteUnit, { color: colors.textMuted }]}>JPY/CNY</Text>
            <Text style={[styles.quoteChange, { color: colors.textMuted }]}>--</Text>
          </View>
        </View>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.trendHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.trend') || '趋势'}</Text>
          <View style={styles.trendTabs}>
            <TouchableOpacity
              style={[styles.trendTab, historyDays === 7 && { backgroundColor: colors.accent }]}
              onPress={() => setHistoryDays(7)}
            >
              <Text style={[styles.trendTabText, historyDays === 7 && { color: '#fff' }]}>7天</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.trendTab, historyDays === 30 && { backgroundColor: colors.accent }]}
              onPress={() => setHistoryDays(30)}
            >
              <Text style={[styles.trendTabText, historyDays === 30 && { color: '#fff' }]}>30天</Text>
            </TouchableOpacity>
          </View>
        </View>

        {historyData.length < 2 ? (
          <Text style={[styles.noDataText, { color: colors.textMuted }]}>{t('home.noTrendData') || '暂无趋势数据'}</Text>
        ) : (
          <TrendChart data={historyData} colors={colors} />
        )}
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
  xLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  xLabel: { fontSize: 10, textAlign: 'center' },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendTabs: { flexDirection: 'row', gap: 8 },
  trendTab: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  trendTabText: { fontSize: 13, fontWeight: '500' },
  noDataText: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  tooltipContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  tooltipContent: {
    width: 110,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  tooltipDate: {
    fontSize: 10,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});