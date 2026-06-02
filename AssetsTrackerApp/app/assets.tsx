// 资产页面 — 合并 流动资金/固定资产/投资理财
// Apple 风格卡片列表 + 盈亏柱状图

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import SegmentedControl from '../src/components/SegmentedControl';
import SectionHeader from '../src/components/SectionHeader';
import { recalculateAllInvestments } from '../src/services/profitCalculator';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 180;
const CHART_PADDING = 32;

type FilterType = 'cash' | 'fixed' | 'investment';

export default function AssetsScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('cash');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  // 加载资产
  const loadAssets = async () => {
    const data = await AsyncStorage.getItem('@assets_tracker/assets');
    setAssets(data ? JSON.parse(data) : []);
  };

  // 加载投资 + 盈亏计算
  const recalcAndMerge = async (data: any[]) => {
    if (!data.length) return data;
    try {
      const updates = await recalculateAllInvestments(data);
      const updateMap: Record<string, any> = {};
      for (const u of updates) updateMap[u.id] = u;

      const updated = data.map((inv: any) => {
        const u = updateMap[inv.id];
        if (!u) return inv;
        const result: any = { ...inv, newPrice: u.newPrice, dailyPnl: u.dailyPnl, dailyReturn: u.dailyReturn, totalPnl: u.totalPnl };
        if (u.newLastPrice > 0) result.lastPrice = u.newLastPrice;
        return result;
      });
      await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('[assets] recalculate error:', e);
      return data;
    }
  };

  const loadInvestments = async () => {
    const raw = await AsyncStorage.getItem('@assets_tracker/investments');
    const data = raw ? JSON.parse(raw) : [];
    const updated = await recalcAndMerge(data);
    setInvestments(updated);
  };

  const loadData = async () => {
    await Promise.all([loadAssets(), loadInvestments()]);
  };

  useEffect(() => { loadData(); }, []);
  useAutoRefresh(loadData);

  // 统计
  const totalCash = assets.filter((a: any) => a.type === 'cash').reduce((sum: number, a: any) => sum + a.amount, 0);
  const totalFixed = assets.filter((a: any) => a.type === 'fixed').reduce((sum: number, a: any) => sum + a.amount, 0);
  const totalInvestmentValue = investments.reduce((sum: number, i: any) => sum + i.amount, 0);
  const totalDailyPnl = investments.reduce((sum: number, i: any) => sum + (i.dailyPnl || 0), 0);

  const formatCurrency = (amount: number) => '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  const formatPercent = (value: number) => (value >= 0 ? '+' : '') + value.toFixed(2) + '%';

  // 删除资产
  const handleDeleteAsset = (id: string) => {
    Alert.alert('确认删除', '确定要删除这笔资产吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const data = await AsyncStorage.getItem('@assets_tracker/assets');
        const arr = data ? JSON.parse(data) : [];
        await AsyncStorage.setItem('@assets_tracker/assets', JSON.stringify(arr.filter((a: any) => a.id !== id)));
        loadAssets();
      }},
    ]);
  };

  // 删除投资
  const handleDeleteInvestment = (id: string) => {
    Alert.alert('确认删除', '确定要删除这笔投资吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const data = await AsyncStorage.getItem('@assets_tracker/investments');
        const arr = data ? JSON.parse(data) : [];
        await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(arr.filter((i: any) => i.id !== id)));
        loadInvestments();
      }},
    ]);
  };

  const subtypeLabels: Record<string, string> = {
    cash: '现金', bank: '银行', alipay: '支付宝', wechat: '微信',
    property: '房产', vehicle: '车辆', equipment: '设备',
    gold: '黄金', yuebao: '余额宝', fund: '基金', 'cn-stock': 'A股', 'hk-stock': '港股',
  };

  // ── 盈亏柱状图 ──
  const renderPnlChart = () => {
    if (investments.length === 0) return null;
    const pnlData = investments
      .map((inv: any, idx: number) => ({ name: inv.name.slice(0, 4), pnl: inv.totalPnl || 0, fullName: inv.name, idx }))
      .filter(d => d.pnl !== 0);
    if (pnlData.length === 0) return null;

    const maxAbs = Math.max(...pnlData.map(d => Math.abs(d.pnl)));
    const chartW = SCREEN_WIDTH - 80;
    const barW = Math.min(40, (chartW - CHART_PADDING * 2) / pnlData.length - 8);
    const zeroY = CHART_HEIGHT * 0.6;

    return (
      <AppleCard padding="md" style={{ marginBottom: spacing.md, alignItems: 'center' }}>
        <Text style={[typography.captionStrong, { color: colors.ink, marginBottom: spacing.xs, alignSelf: 'flex-start' }]}>
          各产品盈亏
        </Text>
        <View style={{ position: 'relative' }}>
          <Svg width={chartW} height={CHART_HEIGHT}>
            <Line x1={CHART_PADDING - 8} y1={zeroY} x2={chartW - 8} y2={zeroY} stroke={colors.hairline} strokeWidth={1} />
            <SvgText x={CHART_PADDING - 12} y={zeroY + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">0</SvgText>
            {pnlData.map((d: any, i: number) => {
              const absH = maxAbs > 0 ? (Math.abs(d.pnl) / maxAbs) * (CHART_HEIGHT * 0.45) : 0;
              const barCenterX = CHART_PADDING + i * ((chartW - CHART_PADDING * 2) / pnlData.length) + (((chartW - CHART_PADDING * 2) / pnlData.length)) / 2;
              const barX = barCenterX - barW / 2;
              const barY = d.pnl >= 0 ? zeroY - absH : zeroY;
              const barColor = d.pnl >= 0 ? colors.gain : colors.loss;
              const isSelected = selectedBar === i;
              const labelY = d.pnl >= 0 ? zeroY + 14 : zeroY - absH - 4;
              return (
                <React.Fragment key={i}>
                  <Rect x={barX} y={0} width={barW} height={CHART_HEIGHT} fill="transparent"
                    onPress={() => setSelectedBar(isSelected ? null : i)} />
                  <Rect x={barX} y={barY} width={barW} height={absH} rx={4}
                    fill={isSelected ? barColor : barColor + '99'}
                    stroke={isSelected ? colors.ink : 'transparent'} strokeWidth={isSelected ? 1.5 : 0} />
                  <SvgText x={barCenterX} y={labelY} fontSize={9} fill={colors.textMuted} textAnchor="middle">
                    {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(0)}
                  </SvgText>
                  <SvgText x={barCenterX} y={CHART_HEIGHT - 4} fontSize={9} fill={colors.textMuted} textAnchor="middle">
                    {d.name}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </AppleCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      {/* ── 顶部统计栏 ── */}
      <View style={{
        flexDirection: 'row', backgroundColor: colors.canvas,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
      }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.finePrint, { color: colors.textMuted }]}>流动资金</Text>
          <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(totalCash)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.finePrint, { color: colors.textMuted }]}>固定资产</Text>
          <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(totalFixed)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.finePrint, { color: colors.textMuted }]}>投资市值</Text>
          <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(totalInvestmentValue)}</Text>
        </View>
      </View>

      {/* ── 分段控制 ── */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <SegmentedControl
          segments={[
            { label: '流动资金', value: 'cash' },
            { label: '固定资产', value: 'fixed' },
            { label: '投资理财', value: 'investment' },
          ]}
          selected={filter}
          onValueChange={v => setFilter(v as FilterType)}
        />
      </View>

      {/* ── 列表 ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 投资模式：显示盈亏柱状图 */}
        {filter === 'investment' && renderPnlChart()}

        {/* ── 资产列表 ── */}
        {filter !== 'investment' && (() => {
          const filtered = assets.filter((a: any) => a.type === filter);
          if (filtered.length === 0) {
            return (
              <View style={{ alignItems: 'center', paddingVertical: 64 }}>
                <Text style={[typography.bodyStrong, { color: colors.ink, marginBottom: spacing.xs }]}>暂无资产</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>点击下方按钮添加</Text>
              </View>
            );
          }
          return filtered.map((asset: any) => (
            <AppleCard key={asset.id} style={{ marginBottom: spacing.sm }}
              onLongPress={() => handleDeleteAsset(asset.id)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[typography.bodyStrong, { color: colors.ink }]}>{asset.name}</Text>
                <View style={{ backgroundColor: colors.parchment, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                  <Text style={[typography.finePrint, { color: colors.textMuted }]}>{subtypeLabels[asset.subtype] || asset.subtype}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                <View>
                  <Text style={[typography.finePrint, { color: colors.textMuted }]}>金额</Text>
                  <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(asset.amount)}</Text>
                </View>
                {asset.note ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{asset.note}</Text>
                ) : null}
              </View>
            </AppleCard>
          ));
        })()}

        {/* ── 投资列表 ── */}
        {filter === 'investment' && (() => {
          if (investments.length === 0) {
            return (
              <View style={{ alignItems: 'center', paddingVertical: 64 }}>
                <Text style={[typography.bodyStrong, { color: colors.ink, marginBottom: spacing.xs }]}>暂无投资</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>点击下方按钮添加</Text>
              </View>
            );
          }
          return investments.map((inv: any) => (
            <AppleCard
              key={inv.id}
              style={{ marginBottom: spacing.sm }}
              onLongPress={() => handleDeleteInvestment(inv.id)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[typography.bodyStrong, { color: colors.ink }]}>{inv.name}</Text>
                <View style={{ backgroundColor: colors.parchment, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                  <Text style={[typography.finePrint, { color: colors.textMuted }]}>{subtypeLabels[inv.subtype] || inv.subtype}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.finePrint, { color: colors.textMuted }]}>当前价</Text>
                  <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(inv.newPrice)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[typography.finePrint, { color: colors.textMuted }]}>今日涨跌</Text>
                  <Text style={[typography.body, { color: (inv.dailyReturn || 0) >= 0 ? colors.gain : colors.loss, marginTop: 2 }]}>
                    {formatPercent(inv.dailyReturn || 0)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[typography.finePrint, { color: colors.textMuted }]}>累计盈亏</Text>
                  <Text style={[typography.bodyStrong, { color: (inv.totalPnl || 0) >= 0 ? colors.gain : colors.loss, marginTop: 2 }]}>
                    {formatCurrency(inv.totalPnl || 0)}
                  </Text>
                </View>
              </View>
            </AppleCard>
          ));
        })()}
      </ScrollView>

      {/* ── 底部添加按钮 ── */}
      <View style={{
        position: 'absolute', bottom: spacing.lg, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.md,
      }}>
        {filter === 'investment' ? (
          <AppleButton title="添加投资" onPress={() => router.push('/add-investment')} />
        ) : (
          <AppleButton title="添加资产" onPress={() => router.push('/add-asset')} />
        )}
      </View>
    </View>
  );
}
