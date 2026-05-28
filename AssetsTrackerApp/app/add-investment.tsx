// 添加投资页面

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StyleProp, ViewStyle } from 'react-native';
import { TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';
import { Investment } from '../src/types/investment';

const subtypes = [
  { value: 'gold', label: '黄金' },
  { value: 'yuebao', label: '余额宝' },
  { value: 'fund', label: '基金' },
  { value: 'cn-stock', label: 'A股' },
  { value: 'hk-stock', label: '港股' },
];

// 生成投资对象（根据 subtype 包含所有必要字段）
function buildInvestment(params: {
  subtype: string;
  name: string;
  amount: number;
  cost: number;
  code?: string;
  // gold
  purchasePrice?: number;
  quantity?: number;
  purchaseDate?: string;
  brand?: string;
  productType?: string;
  // yuebao
  share?: number;
  incomeYesterday?: number;
  sevenDayYield?: number;
  // fund
  fundCode?: string;
  netValue?: number;
  purchaseCost?: number;
  // cn-stock
  stockCode?: string;
  // hk-stock
  purchaseCurrency?: string;
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
        ...base,
        subtype: 'gold',
        productType: (params.productType as '实物金' | '纸黄金' | 'ETF基金') ?? '纸黄金',
        purchasePrice: params.purchasePrice ?? 0,
        quantity: params.quantity ?? 0,
        purchaseDate: params.purchaseDate ?? now.split('T')[0],
        brand: params.brand,
      };
    case 'yuebao':
      return {
        ...base,
        subtype: 'yuebao',
        share: params.share ?? params.cost,
        incomeYesterday: params.incomeYesterday ?? 0,
        sevenDayYield: params.sevenDayYield ?? 0,
      };
    case 'fund':
      return {
        ...base,
        subtype: 'fund',
        fundCode: params.fundCode ?? '',
        share: params.share ?? 0,
        netValue: params.netValue ?? params.purchaseCost ?? 1,
        purchaseCost: params.purchaseCost ?? 1,
      };
    case 'cn-stock':
      return {
        ...base,
        subtype: 'cn-stock',
        stockCode: params.stockCode ?? '',
        share: params.share ?? 0,
        purchasePrice: params.purchasePrice ?? 0,
      };
    case 'hk-stock':
      return {
        ...base,
        subtype: 'hk-stock',
        stockCode: params.stockCode ?? '',
        share: params.share ?? 0,
        purchasePrice: params.purchasePrice ?? 0,
        purchaseCurrency: (params.purchaseCurrency as 'HKD' | 'CNY') ?? 'HKD',
      };
    default:
      throw new Error(`Unknown subtype: ${params.subtype}`);
  }
}

export default function AddInvestmentScreen() {
  const { colors } = useTheme();
  const [subtype, setSubtype] = useState('gold');

  // 通用字段
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');

  // gold 专用
  const [purchasePrice, setPurchasePrice] = useState('');   // 买入单价(克)
  const [quantity, setQuantity] = useState('');               // 克数
  const [purchaseDate, setPurchaseDate] = useState('');       // YYYY-MM-DD
  const [brand, setBrand] = useState('');                     // 品牌(可选)
  const [productType, setProductType] = useState<'实物金' | '纸黄金' | 'ETF基金'>('纸黄金');

  // yuebao 专用
  const [yuebaoShare, setYuebaoShare] = useState('');          // 份额
  const [incomeYesterday, setIncomeYesterday] = useState('');    // 昨日收益
  const [sevenDayYield, setSevenDayYield] = useState('');        // 7日年化(%)

  // fund 专用
  const [fundCode, setFundCode] = useState('');
  const [fundShare, setFundShare] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');        // 买入时净值

  // 股票专用 (cn/hk)
  const [stockCode, setStockCode] = useState('');
  const [stockShare, setStockShare] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'HKD' | 'CNY'>('HKD');

  const labelStyle = { color: colors.textSecondary, fontSize: 14, marginTop: 14, marginBottom: 6 };

  const makeInput = (
    fieldLabel: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'decimal-pad' = 'default',
    styleProp?: StyleProp<ViewStyle>
  ) => (
    <>
      <Text style={labelStyle}>{fieldLabel}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        mode="outlined"
        outlineColor={colors.border}
        activeOutlineColor={colors.accent}
        textColor={colors.text}
        style={[styles.input, { backgroundColor: colors.cardSecondary }, styleProp]}
      />
    </>
  );

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入产品名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入当前市值'); return; }
    if (!cost || parseFloat(cost) <= 0) { Alert.alert('错误', '请输入总成本'); return; }

    const a = parseFloat(amount);
    const c = parseFloat(cost);

    try {
      const investment = buildInvestment({
        subtype,
        name: name.trim(),
        amount: a,
        cost: c,
        code: undefined,

        // gold
        purchasePrice: parseFloat(purchasePrice) || undefined,
        quantity: parseFloat(quantity) || undefined,
        purchaseDate: purchaseDate || undefined,
        brand: brand.trim() || undefined,
        productType,

        // yuebao
        share: parseFloat(yuebaoShare) || c,
        incomeYesterday: parseFloat(incomeYesterday) || undefined,
        sevenDayYield: parseFloat(sevenDayYield) || undefined,

        // fund
        fundCode: fundCode.trim() || undefined,
        netValue: parseFloat(purchaseCost) || undefined,
        purchaseCost: parseFloat(purchaseCost) || undefined,

        // cn/hk stock
        stockCode: stockCode.trim() || undefined,
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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          {/* 类型切换 */}
          <Text style={[labelStyle, { marginTop: 0 }]}>产品类型</Text>
          <View style={styles.subtypeGrid}>
            {subtypes.map(s => (
              <Button
                key={s.value}
                mode={subtype === s.value ? 'contained' : 'outlined'}
                onPress={() => setSubtype(s.value)}
                style={styles.subtypeBtn}
                buttonColor={subtype === s.value ? colors.accent : 'transparent'}
                textColor={subtype === s.value ? colors.accentText : colors.textMuted}
                compact
              >{s.label}</Button>
            ))}
          </View>

          {/* 通用字段：产品名称 */}
          {makeInput('产品名称', name, setName, '例如：华安黄金ETF')}

          {/* ── 黄金 ── */}
          {subtype === 'gold' && (
            <>
              <Text style={labelStyle}>金条类型</Text>
              <SegmentedButtons
                value={productType}
                onValueChange={v => setProductType(v as typeof productType)}
                buttons={[
                  { value: '实物金', label: '实物金' },
                  { value: '纸黄金', label: '纸黄金' },
                  { value: 'ETF基金', label: 'ETF基金' },
                ]}
                style={{ marginBottom: 8 }}
              />
              {makeInput('买入单价 (元/克)', purchasePrice, setPurchasePrice, '例如：520.5', 'decimal-pad')}
              {makeInput('克数', quantity, setQuantity, '例如：10', 'decimal-pad')}
              {makeInput('买入日期', purchaseDate, setPurchaseDate, 'YYYY-MM-DD', 'default')}
              {makeInput('品牌 (可选)', brand, setBrand, '例如：老凤祥')}
            </>
          )}

          {/* ── 余额宝 ── */}
          {subtype === 'yuebao' && (
            <>
              {makeInput('持有份额', yuebaoShare, setYuebaoShare, '默认为总成本，可填实际份额', 'decimal-pad')}
              {makeInput('昨日收益 (元)', incomeYesterday, setIncomeYesterday, '例如：1.23', 'decimal-pad')}
              {makeInput('7日年化收益率 (%)', sevenDayYield, setSevenDayYield, '例如：1.85', 'decimal-pad')}
            </>
          )}

          {/* ── 基金 ── */}
          {subtype === 'fund' && (
            <>
              {makeInput('基金代码', fundCode, setFundCode, '例如：510300')}
              {makeInput('持有份额', fundShare, setFundShare, '例如：1000', 'decimal-pad')}
              {makeInput('买入时净值 (元)', purchaseCost, setPurchaseCost, '买入时的基金净值', 'decimal-pad')}
            </>
          )}

          {/* ── A股 ── */}
          {subtype === 'cn-stock' && (
            <>
              {makeInput('股票代码', stockCode, setStockCode, '例如：600539')}
              {makeInput('持有股数', stockShare, setStockShare, '例如：100', 'decimal-pad')}
              {makeInput('买入价格 (元)', stockPurchasePrice, setStockPurchasePrice, '买入时的股价', 'decimal-pad')}
            </>
          )}

          {/* ── 港股 ── */}
          {subtype === 'hk-stock' && (
            <>
              {makeInput('股票代码', stockCode, setStockCode, '例如：00700')}
              {makeInput('持有股数', stockShare, setStockShare, '例如：100', 'decimal-pad')}
              {makeInput('买入价格 (HKD)', stockPurchasePrice, setStockPurchasePrice, '买入时的股价', 'decimal-pad')}
              <Text style={labelStyle}>买入货币</Text>
              <SegmentedButtons
                value={purchaseCurrency}
                onValueChange={v => setPurchaseCurrency(v as 'HKD' | 'CNY')}
                buttons={[
                  { value: 'HKD', label: '港币 HKD' },
                  { value: 'CNY', label: '人民币 CNY' },
                ]}
                style={{ marginBottom: 8 }}
              />
            </>
          )}

          {/* 通用字段：当前市值 & 总成本 */}
          {makeInput('当前市值 (元)', amount, setAmount, '当前总市值', 'decimal-pad')}
          {makeInput('总成本 (元)', cost, setCost, '买入时的总支出', 'decimal-pad')}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        style={[styles.saveBtn, { backgroundColor: colors.accent }]}
        buttonColor={colors.accent}
        textColor={colors.accentText}
      >保存</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, borderRadius: 12 },
  label: { fontSize: 14, marginTop: 14, marginBottom: 8 },
  subtypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  subtypeBtn: { borderColor: '#2a2a4e' },
  input: { marginBottom: 6 },
  saveBtn: { marginTop: 8 },
});