// 投资详情/编辑页面 — Apple 风格

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import { Investment } from '../src/types/investment';

export default function InvestmentDetailScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // 表单状态
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [productType, setProductType] = useState<'实物金' | '纸黄金' | 'ETF基金'>('纸黄金');
  const [yuebaoShare, setYuebaoShare] = useState('');
  const [incomeYesterday, setIncomeYesterday] = useState('');
  const [sevenDayYield, setSevenDayYield] = useState('');
  const [fundCode, setFundCode] = useState('');
  const [fundShare, setFundShare] = useState('');
  const [netValue, setNetValue] = useState('');
  const [stockCode, setStockCode] = useState('');
  const [stockShare, setStockShare] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'HKD' | 'CNY'>('HKD');

  useEffect(() => { loadInvestment(); }, [id]);

  const loadInvestment = async () => {
    try {
      const raw = await AsyncStorage.getItem('@assets_tracker/investments');
      const list: Investment[] = raw ? JSON.parse(raw) : [];
      const found = list.find(inv => inv.id === id);
      if (!found) {
        Alert.alert('错误', '未找到投资记录', [{ text: '确定', onPress: () => router.back() }]);
        return;
      }
      setInvestment(found);
      populateForm(found);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (inv: Investment) => {
    setName(inv.name);
    setAmount(String(inv.amount));
    setCost(String(inv.cost));
    if (inv.subtype === 'gold') {
      setPurchasePrice(String(inv.purchasePrice));
      setQuantity(String(inv.quantity));
      setPurchaseDate(inv.purchaseDate || '');
      setProductType(inv.productType || '纸黄金');
    } else if (inv.subtype === 'yuebao') {
      setYuebaoShare(String(inv.share));
      setIncomeYesterday(String(inv.incomeYesterday));
      setSevenDayYield(String(inv.sevenDayYield));
    } else if (inv.subtype === 'fund') {
      setFundCode(inv.fundCode || '');
      setFundShare(String(inv.share));
      setNetValue(String(inv.netValue || inv.purchaseCost || 0));
    } else if (inv.subtype === 'cn-stock' || inv.subtype === 'hk-stock') {
      setStockCode(inv.stockCode || '');
      setStockShare(String(inv.share));
      setStockPurchasePrice(String(inv.purchasePrice));
      if (inv.subtype === 'hk-stock') setPurchaseCurrency(inv.purchaseCurrency || 'HKD');
    }
  };

  const handleSave = async () => {
    if (!investment) return;
    if (!name.trim()) { Alert.alert('错误', '请输入名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入有效市值'); return; }

    const a = parseFloat(amount);
    const c = parseFloat(cost);

    const updated: Investment = {
      ...investment,
      name: name.trim(), amount: a, cost: c,
      lastPrice: a / (investment.subtype === 'yuebao' ? parseFloat(yuebaoShare) || c : (investment.subtype === 'fund' ? parseFloat(fundShare) || 1 : 1)),
      totalPnl: a - c,
      dailyReturn: c > 0 ? ((a - c) / c) * 100 : 0,
      updatedAt: new Date().toISOString(),
      ...(investment.subtype === 'gold' && {
        purchasePrice: parseFloat(purchasePrice) || 0,
        quantity: parseFloat(quantity) || 0,
        purchaseDate: purchaseDate || investment.purchaseDate,
        productType,
      }),
      ...(investment.subtype === 'yuebao' && {
        share: parseFloat(yuebaoShare) || c,
        incomeYesterday: parseFloat(incomeYesterday) || 0,
        sevenDayYield: parseFloat(sevenDayYield) || 0,
      }),
      ...(investment.subtype === 'fund' && {
        fundCode: fundCode.trim(),
        share: parseFloat(fundShare) || 0,
        netValue: parseFloat(netValue) || 0,
      }),
      ...((investment.subtype === 'cn-stock' || investment.subtype === 'hk-stock') && {
        stockCode: stockCode.trim(),
        share: parseFloat(stockShare) || 0,
        purchasePrice: parseFloat(stockPurchasePrice) || 0,
        ...(investment.subtype === 'hk-stock' && { purchaseCurrency }),
      }),
    };

    try {
      const raw = await AsyncStorage.getItem('@assets_tracker/investments');
      const list: Investment[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(inv => inv.id === id);
      if (idx === -1) { Alert.alert('错误', '未找到'); return; }
      list[idx] = updated;
      await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(list));
      setInvestment(updated);
      setEditMode(false);
    } catch (e) {
      Alert.alert('错误', '保存失败：' + String(e));
    }
  };

  const handleDelete = () => {
    Alert.alert('确认删除', '确定要删除这笔投资吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const raw = await AsyncStorage.getItem('@assets_tracker/investments');
        const list: Investment[] = raw ? JSON.parse(raw) : [];
        await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(list.filter(inv => inv.id !== id)));
        router.back();
      }},
    ]);
  };

  const formatCurrency = (v: number) => '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  const formatPercent = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.parchment }} />;
  if (!investment) return null;

  const subtypeMap: Record<string, string> = {
    gold: '黄金', yuebao: '余额宝', fund: '基金', 'cn-stock': 'A股', 'hk-stock': '港股',
  };

  // 通用详情行
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.caption, { color: colors.ink, fontWeight: '500' }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.parchment }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        {/* 头部 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.tagline, { color: colors.ink }]}>{investment.name}</Text>
            <View style={{ backgroundColor: colors.parchment, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start', marginTop: spacing.xxs }}>
              <Text style={[typography.finePrint, { color: colors.textMuted }]}>{subtypeMap[investment.subtype]}</Text>
            </View>
          </View>
          {!editMode && (
            <AppleButton title="编辑" variant="secondary" onPress={() => setEditMode(true)} />
          )}
        </View>

        {/* ── 查看模式 ── */}
        {!editMode && (
          <>
            {/* 统计 */}
            <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.finePrint, { color: colors.textMuted }]}>当前市值</Text>
                <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(investment.amount)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.finePrint, { color: colors.textMuted }]}>总成本</Text>
                <Text style={[typography.bodyStrong, { color: colors.ink, marginTop: 2 }]}>{formatCurrency(investment.cost)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.finePrint, { color: colors.textMuted }]}>今日涨跌</Text>
                <Text style={[typography.bodyStrong, { color: (investment.dailyReturn || 0) >= 0 ? colors.gain : colors.loss, marginTop: 2 }]}>
                  {formatPercent(investment.dailyReturn || 0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.finePrint, { color: colors.textMuted }]}>累计盈亏</Text>
                <Text style={[typography.bodyStrong, { color: investment.totalPnl >= 0 ? colors.gain : colors.loss, marginTop: 2 }]}>
                  {formatCurrency(investment.totalPnl)}
                </Text>
              </View>
            </View>

            {/* 分割线 */}
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm }} />

            {/* 子类型详情 */}
            {investment.subtype === 'gold' && (
              <>
                <DetailRow label="黄金类型" value={investment.productType} />
                <DetailRow label="买入单价" value={`¥${investment.purchasePrice?.toFixed(2)}/克`} />
                <DetailRow label="持有克数" value={`${investment.quantity} 克`} />
                <DetailRow label="买入日期" value={investment.purchaseDate} />
              </>
            )}
            {investment.subtype === 'yuebao' && (
              <>
                <DetailRow label="份额" value={investment.share.toLocaleString()} />
                <DetailRow label="昨日收益" value={formatCurrency(investment.incomeYesterday)} />
                <DetailRow label="7日年化" value={`${investment.sevenDayYield?.toFixed(4)}%`} />
              </>
            )}
            {investment.subtype === 'fund' && (
              <>
                <DetailRow label="基金代码" value={investment.fundCode} />
                <DetailRow label="持有份额" value={String(investment.share)} />
                <DetailRow label="买入净值" value={`¥${investment.netValue?.toFixed(4) || '—'}`} />
              </>
            )}
            {(investment.subtype === 'cn-stock' || investment.subtype === 'hk-stock') && (
              <>
                <DetailRow label="股票代码" value={investment.stockCode} />
                <DetailRow label="持有股数" value={String(investment.share)} />
                <DetailRow label="买入价格" value={`${formatCurrency(investment.purchasePrice)}${investment.subtype === 'hk-stock' ? ` ${investment.purchaseCurrency}` : ''}`} />
              </>
            )}
          </>
        )}

        {/* ── 编辑模式 ── */}
        {editMode && (
          <>
            <AppleTextInput label="产品名称" value={name} onChangeText={setName} placeholder="产品名称" />
            <AppleTextInput label="当前市值（¥）" value={amount} onChangeText={setAmount} placeholder="当前市值" keyboardType="decimal-pad" />
            <AppleTextInput label="总成本（¥）" value={cost} onChangeText={setCost} placeholder="总成本" keyboardType="decimal-pad" />

            {investment.subtype === 'gold' && (
              <>
                <Text style={[typography.captionStrong, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>黄金类型</Text>
                <SegmentedControl
                  segments={[{ label: '实物金', value: '实物金' }, { label: '纸黄金', value: '纸黄金' }, { label: 'ETF', value: 'ETF基金' }]}
                  selected={productType}
                  onValueChange={v => setProductType(v as typeof productType)}
                />
                <AppleTextInput label="买入单价（¥/克）" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" />
                <AppleTextInput label="克数" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
                <AppleTextInput label="买入日期" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" />
              </>
            )}
            {investment.subtype === 'yuebao' && (
              <>
                <AppleTextInput label="份额" value={yuebaoShare} onChangeText={setYuebaoShare} keyboardType="decimal-pad" />
                <AppleTextInput label="昨日收益（¥）" value={incomeYesterday} onChangeText={setIncomeYesterday} keyboardType="decimal-pad" />
                <AppleTextInput label="7日年化（%）" value={sevenDayYield} onChangeText={setSevenDayYield} keyboardType="decimal-pad" />
              </>
            )}
            {investment.subtype === 'fund' && (
              <>
                <AppleTextInput label="基金代码" value={fundCode} onChangeText={setFundCode} />
                <AppleTextInput label="持有份额" value={fundShare} onChangeText={setFundShare} keyboardType="decimal-pad" />
                <AppleTextInput label="买入净值" value={netValue} onChangeText={setNetValue} keyboardType="decimal-pad" />
              </>
            )}
            {investment.subtype === 'cn-stock' && (
              <>
                <AppleTextInput label="股票代码" value={stockCode} onChangeText={setStockCode} />
                <AppleTextInput label="持有股数" value={stockShare} onChangeText={setStockShare} keyboardType="decimal-pad" />
                <AppleTextInput label="买入价格（¥）" value={stockPurchasePrice} onChangeText={setStockPurchasePrice} keyboardType="decimal-pad" />
              </>
            )}
            {investment.subtype === 'hk-stock' && (
              <>
                <AppleTextInput label="股票代码" value={stockCode} onChangeText={setStockCode} />
                <AppleTextInput label="持有股数" value={stockShare} onChangeText={setStockShare} keyboardType="decimal-pad" />
                <AppleTextInput label="买入价格（HKD）" value={stockPurchasePrice} onChangeText={setStockPurchasePrice} keyboardType="decimal-pad" />
                <Text style={[typography.captionStrong, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>买入货币</Text>
                <SegmentedControl
                  segments={[{ label: 'HKD', value: 'HKD' }, { label: 'CNY', value: 'CNY' }]}
                  selected={purchaseCurrency}
                  onValueChange={v => setPurchaseCurrency(v as 'HKD' | 'CNY')}
                />
              </>
            )}
          </>
        )}
      </AppleCard>

      {/* 操作按钮 */}
      {editMode ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <AppleButton title="取消" variant="secondary" onPress={() => { setEditMode(false); if (investment) populateForm(investment); }} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <AppleButton title="保存" onPress={handleSave} fullWidth />
          </View>
        </View>
      ) : (
        <AppleButton title="删除投资" variant="danger" onPress={handleDelete} fullWidth />
      )}
    </ScrollView>
  );
}
