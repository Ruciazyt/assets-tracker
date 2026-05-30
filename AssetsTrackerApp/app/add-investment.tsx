// 添加投资页面 — Apple 风格表单
// 支持 黄金/余额宝/基金/A股/港股

import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import { Investment } from '../src/types/investment';

export default function AddInvestmentScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const [subtype, setSubtype] = useState('gold');

  // 通用字段
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');

  // 黄金专用
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [brand, setBrand] = useState('');
  const [productType, setProductType] = useState<'实物金' | '纸黄金' | 'ETF基金'>('纸黄金');

  // 余额宝
  const [yuebaoShare, setYuebaoShare] = useState('');
  const [incomeYesterday, setIncomeYesterday] = useState('');
  const [sevenDayYield, setSevenDayYield] = useState('');

  // 基金
  const [fundCode, setFundCode] = useState('');
  const [fundShare, setFundShare] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');

  // 股票
  const [stockCode, setStockCode] = useState('');
  const [stockShare, setStockShare] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'HKD' | 'CNY'>('HKD');

  const subtypes = [
    { value: 'gold', label: '黄金' },
    { value: 'yuebao', label: '余额宝' },
    { value: 'fund', label: '基金' },
    { value: 'cn-stock', label: 'A股' },
    { value: 'hk-stock', label: '港股' },
  ];

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入产品名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入当前市值'); return; }
    if (!cost || parseFloat(cost) <= 0) { Alert.alert('错误', '请输入总成本'); return; }

    const a = parseFloat(amount);
    const c = parseFloat(cost);

    try {
      const investment = buildInvestment({
        subtype, name: name.trim(), amount: a, cost: c,
        purchasePrice: parseFloat(purchasePrice) || undefined,
        quantity: parseFloat(quantity) || undefined,
        purchaseDate: purchaseDate || undefined,
        brand: brand.trim() || undefined,
        productType,
        share: parseFloat(yuebaoShare) || c,
        incomeYesterday: parseFloat(incomeYesterday) || undefined,
        sevenDayYield: parseFloat(sevenDayYield) || undefined,
        fundCode: fundCode.trim() || undefined,
        fundShare: parseFloat(fundShare) || undefined,
        netValue: parseFloat(purchaseCost) || undefined,
        purchaseCost: parseFloat(purchaseCost) || undefined,
        stockCode: stockCode.trim() || undefined,
        stockShare: parseFloat(stockShare) || undefined,
        stockPurchasePrice: parseFloat(stockPurchasePrice) || undefined,
        purchaseCurrency,
      });

      const existing = await AsyncStorage.getItem('@assets_tracker/investments');
      const investments: Investment[] = existing ? JSON.parse(existing) : [];
      investments.push(investment);
      await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(investments));
      router.back();
    } catch (e) {
      Alert.alert('错误', '保存失败：' + String(e));
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.parchment }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        {/* 投资类型 */}
        <Text style={[typography.captionStrong, { color: colors.textMuted, marginBottom: spacing.xs }]}>投资类型</Text>
        <SegmentedControl
          segments={subtypes}
          selected={subtype}
          onValueChange={setSubtype}
          scrollable
        />

        {/* 产品名称 */}
        <View style={{ marginTop: spacing.sm }}>
          <AppleTextInput label="产品名称" value={name} onChangeText={setName} placeholder="例如：华安黄金ETF" />
        </View>

        {/* ── 黄金 ── */}
        {subtype === 'gold' && (
          <>
            <Text style={[typography.captionStrong, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>黄金类型</Text>
            <SegmentedControl
              segments={[
                { label: '实物金', value: '实物金' },
                { label: '纸黄金', value: '纸黄金' },
                { label: 'ETF', value: 'ETF基金' },
              ]}
              selected={productType}
              onValueChange={v => setProductType(v as typeof productType)}
            />
            <AppleTextInput label="买入单价（¥/克）" value={purchasePrice} onChangeText={setPurchasePrice} placeholder="520.5" keyboardType="decimal-pad" />
            <AppleTextInput label="克数" value={quantity} onChangeText={setQuantity} placeholder="10" keyboardType="decimal-pad" />
            <AppleTextInput label="买入日期" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" />
            <AppleTextInput label="品牌（可选）" value={brand} onChangeText={setBrand} placeholder="例如：中国黄金" />
          </>
        )}

        {/* ── 余额宝 ── */}
        {subtype === 'yuebao' && (
          <>
            <AppleTextInput label="份额" value={yuebaoShare} onChangeText={setYuebaoShare} placeholder="默认等于总成本" keyboardType="decimal-pad" />
            <AppleTextInput label="昨日收益（¥）" value={incomeYesterday} onChangeText={setIncomeYesterday} placeholder="1.23" keyboardType="decimal-pad" />
            <AppleTextInput label="7日年化收益率（%）" value={sevenDayYield} onChangeText={setSevenDayYield} placeholder="1.85" keyboardType="decimal-pad" />
          </>
        )}

        {/* ── 基金 ── */}
        {subtype === 'fund' && (
          <>
            <AppleTextInput label="基金代码" value={fundCode} onChangeText={setFundCode} placeholder="510300" />
            <AppleTextInput label="持有份额" value={fundShare} onChangeText={setFundShare} placeholder="1000" keyboardType="decimal-pad" />
            <AppleTextInput label="买入时净值" value={purchaseCost} onChangeText={setPurchaseCost} placeholder="1.5" keyboardType="decimal-pad" />
          </>
        )}

        {/* ── A股 ── */}
        {subtype === 'cn-stock' && (
          <>
            <AppleTextInput label="股票代码" value={stockCode} onChangeText={setStockCode} placeholder="600539" />
            <AppleTextInput label="持有股数" value={stockShare} onChangeText={setStockShare} placeholder="100" keyboardType="decimal-pad" />
            <AppleTextInput label="买入价格（¥）" value={stockPurchasePrice} onChangeText={setStockPurchasePrice} placeholder="8.50" keyboardType="decimal-pad" />
          </>
        )}

        {/* ── 港股 ── */}
        {subtype === 'hk-stock' && (
          <>
            <AppleTextInput label="股票代码" value={stockCode} onChangeText={setStockCode} placeholder="00700" />
            <AppleTextInput label="持有股数" value={stockShare} onChangeText={setStockShare} placeholder="100" keyboardType="decimal-pad" />
            <AppleTextInput label="买入价格（HKD）" value={stockPurchasePrice} onChangeText={setStockPurchasePrice} placeholder="350.00" keyboardType="decimal-pad" />
            <Text style={[typography.captionStrong, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>买入货币</Text>
            <SegmentedControl
              segments={[{ label: 'HKD', value: 'HKD' }, { label: 'CNY', value: 'CNY' }]}
              selected={purchaseCurrency}
              onValueChange={v => setPurchaseCurrency(v as 'HKD' | 'CNY')}
            />
          </>
        )}

        {/* 通用字段 */}
        <View style={{ marginTop: spacing.md }}>
          <AppleTextInput label="当前市值（¥）" value={amount} onChangeText={setAmount} placeholder="当前总市值" keyboardType="decimal-pad" />
          <AppleTextInput label="总成本（¥）" value={cost} onChangeText={setCost} placeholder="买入时的总成本" keyboardType="decimal-pad" />
        </View>
      </AppleCard>

      <AppleButton title="保存" onPress={handleSave} fullWidth />
    </ScrollView>
  );
}

// ── 投资对象构建 ──

function buildInvestment(params: {
  subtype: string; name: string; amount: number; cost: number;
  purchasePrice?: number; quantity?: number; purchaseDate?: string; brand?: string; productType?: string;
  share?: number; incomeYesterday?: number; sevenDayYield?: number;
  fundCode?: string; fundShare?: number; netValue?: number; purchaseCost?: number;
  stockCode?: string; stockShare?: number; stockPurchasePrice?: number; purchaseCurrency?: string;
}): Investment {
  const now = new Date().toISOString();
  const base = {
    id: Date.now().toString(),
    type: 'investment' as const,
    name: params.name,
    amount: params.amount,
    currency: 'CNY' as const,
    cost: params.cost,
    costBasis: 'AVG' as const,
    lastPrice: params.amount / (params.share ?? 1),
    dailyPnl: 0,
    totalPnl: params.amount - params.cost,
    dailyReturn: params.cost > 0 ? ((params.amount - params.cost) / params.cost) * 100 : 0,
    createdAt: now,
    updatedAt: now,
  };

  switch (params.subtype) {
    case 'gold':
      return {
        ...base, lastPrice: params.purchasePrice ?? 0, subtype: 'gold',
        productType: (params.productType as '实物金' | '纸黄金' | 'ETF基金') ?? '纸黄金',
        purchasePrice: params.purchasePrice ?? 0, quantity: params.quantity ?? 0,
        purchaseDate: params.purchaseDate ?? now.split('T')[0], brand: params.brand,
      };
    case 'yuebao':
      return { ...base, subtype: 'yuebao', share: params.share ?? params.cost,
        incomeYesterday: params.incomeYesterday ?? 0, sevenDayYield: params.sevenDayYield ?? 0 };
    case 'fund':
      return { ...base, subtype: 'fund', fundCode: params.fundCode ?? '',
        share: params.share ?? 0, netValue: params.netValue ?? params.purchaseCost ?? 1,
        purchaseCost: params.purchaseCost ?? 1 };
    case 'cn-stock':
      return { ...base, subtype: 'cn-stock', stockCode: params.stockCode ?? '',
        share: params.stockShare ?? 0, purchasePrice: params.stockPurchasePrice ?? 0 };
    case 'hk-stock':
      return { ...base, subtype: 'hk-stock', stockCode: params.stockCode ?? '',
        share: params.stockShare ?? 0, purchasePrice: params.stockPurchasePrice ?? 0,
        purchaseCurrency: (params.purchaseCurrency as 'HKD' | 'CNY') ?? 'HKD' };
    default:
      throw new Error(`Unknown subtype: ${params.subtype}`);
  }
}
