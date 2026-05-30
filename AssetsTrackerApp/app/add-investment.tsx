// 添加投资页面 — Apple 风格表单 + 基金搜索 + AI 图片导入

import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import { Investment } from '../src/types/investment';
import { searchFunds, FundSearchResult } from '../src/services/market/fund';
import { analyzeImage } from '../src/services/imageImport';

export default function AddInvestmentScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const [subtype, setSubtype] = useState('gold');

  // 通用字段
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');

  // 黄金
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
  const [fundSearchKeyword, setFundSearchKeyword] = useState('');
  const [fundSearchResults, setFundSearchResults] = useState<FundSearchResult[]>([]);
  const [fundSearching, setFundSearching] = useState(false);

  // 股票
  const [stockCode, setStockCode] = useState('');
  const [stockShare, setStockShare] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'HKD' | 'CNY'>('HKD');

  // AI 导入
  const [importing, setImporting] = useState(false);

  const subtypes = [
    { value: 'gold', label: '黄金' },
    { value: 'yuebao', label: '余额宝' },
    { value: 'fund', label: '基金' },
    { value: 'cn-stock', label: 'A股' },
    { value: 'hk-stock', label: '港股' },
  ];

  // ── 基金搜索 ──
  const handleFundSearch = useCallback(async () => {
    if (!fundSearchKeyword.trim()) return;
    setFundSearching(true);
    try {
      const results = await searchFunds(fundSearchKeyword.trim());
      setFundSearchResults(results);
      if (results.length === 0) Alert.alert('提示', '未找到匹配的基金，请尝试其他关键词');
    } catch (e) {
      Alert.alert('错误', '搜索失败');
    } finally {
      setFundSearching(false);
    }
  }, [fundSearchKeyword]);

  const selectFund = (fund: FundSearchResult) => {
    setFundCode(fund.code);
    setName(fund.name);
    setFundSearchResults([]);
    setFundSearchKeyword('');
  };

  // ── AI 图片导入 ──
  const handleImageImport = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('提示', '需要相册权限'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.7, base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;

      setImporting(true);
      const asset = result.assets[0];
      const base64: string = asset.base64 ?? '';
      const mimeType: string = asset.mimeType ?? 'image/jpeg';
      if (!base64) { Alert.alert('错误', '无法读取图片数据'); return; }
      const recognized = await analyzeImage(base64, mimeType);

      if (recognized) {
        if (recognized.name) setName(recognized.name);
        if (recognized.amount) setAmount(String(recognized.amount));
        if (recognized.cost) setCost(String(recognized.cost));
        if (recognized.purchasePrice) setPurchasePrice(String(recognized.purchasePrice));
        if (recognized.quantity) setQuantity(String(recognized.quantity));
        if (recognized.fundCode) { setFundCode(recognized.fundCode); setSubtype('fund'); }
        if (recognized.stockCode) {
          setStockCode(recognized.stockCode);
          setSubtype(recognized.stockCode.startsWith('0') ? 'hk-stock' : 'cn-stock');
        }
        if (recognized.share) {
          setStockShare(String(recognized.share));
          setFundShare(String(recognized.share));
        }
        Alert.alert('识别成功', '已自动填入，请检查并修改');
      } else {
        Alert.alert('识别失败', '请手动输入');
      }
    } catch (e: any) {
      Alert.alert('错误', e.message || '识别失败');
    } finally {
      setImporting(false);
    }
  };

  // ── 保存 ──
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入产品名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入当前市值'); return; }
    if (!cost || parseFloat(cost) <= 0) { Alert.alert('错误', '请输入总成本'); return; }

    try {
      const investment = buildInvestment({
        subtype, name: name.trim(), amount: parseFloat(amount), cost: parseFloat(cost),
        purchasePrice: parseFloat(purchasePrice) || undefined,
        quantity: parseFloat(quantity) || undefined,
        purchaseDate: purchaseDate || undefined,
        brand: brand.trim() || undefined,
        productType,
        share: parseFloat(yuebaoShare) || parseFloat(cost),
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
      {/* AI 图片导入 */}
      <AppleButton
        title={importing ? '识别中...' : '📸 截图导入'}
        onPress={handleImageImport}
        variant="secondary"
        fullWidth
        loading={importing}
        style={{ marginBottom: spacing.md }}
      />

      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        {/* 投资类型 */}
        <Text style={[typography.captionStrong, { color: colors.textMuted, marginBottom: spacing.xs }]}>投资类型</Text>
        <SegmentedControl segments={subtypes} selected={subtype} onValueChange={setSubtype} scrollable />

        {/* 产品名称 */}
        <View style={{ marginTop: spacing.sm }}>
          <AppleTextInput label="产品名称" value={name} onChangeText={setName} placeholder="例如：华安黄金ETF" />
        </View>

        {/* ── 黄金 ── */}
        {subtype === 'gold' && (
          <>
            <Text style={[typography.captionStrong, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>黄金类型</Text>
            <SegmentedControl
              segments={[{ label: '实物金', value: '实物金' }, { label: '纸黄金', value: '纸黄金' }, { label: 'ETF', value: 'ETF基金' }]}
              selected={productType} onValueChange={v => setProductType(v as typeof productType)}
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
            <AppleTextInput label="7日年化（%）" value={sevenDayYield} onChangeText={setSevenDayYield} placeholder="1.85" keyboardType="decimal-pad" />
          </>
        )}

        {/* ── 基金（带搜索） ── */}
        {subtype === 'fund' && (
          <>
            <Text style={[typography.captionStrong, { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs }]}>搜索基金</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <AppleTextInput
                  value={fundSearchKeyword}
                  onChangeText={setFundSearchKeyword}
                  placeholder="输入基金名称或代码"
                  onSubmitEditing={handleFundSearch}
                  returnKeyType="search"
                />
              </View>
              <AppleButton title="搜索" onPress={handleFundSearch} loading={fundSearching} />
            </View>

            {/* 搜索结果 */}
            {fundSearchResults.length > 0 && (
              <View style={{
                backgroundColor: colors.canvas, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.hairline, marginTop: spacing.xs,
                maxHeight: 200,
              }}>
                {fundSearchResults.map((fund, i) => (
                  <TouchableOpacity key={fund.code}
                    style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                      borderBottomWidth: i < fundSearchResults.length - 1 ? 1 : 0,
                      borderBottomColor: colors.divider,
                    }}
                    onPress={() => selectFund(fund)}
                  >
                    <Text style={[typography.body, { color: colors.ink }]} numberOfLines={1}>{fund.name}</Text>
                    <Text style={[typography.caption, { color: colors.primary }]}>{fund.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <AppleTextInput label="基金代码" value={fundCode} onChangeText={setFundCode} placeholder="搜索后自动填入或手动输入" />
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
              selected={purchaseCurrency} onValueChange={v => setPurchaseCurrency(v as 'HKD' | 'CNY')}
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

function buildInvestment(params: {
  subtype: string; name: string; amount: number; cost: number;
  purchasePrice?: number; quantity?: number; purchaseDate?: string; brand?: string; productType?: string;
  share?: number; incomeYesterday?: number; sevenDayYield?: number;
  fundCode?: string; fundShare?: number; netValue?: number; purchaseCost?: number;
  stockCode?: string; stockShare?: number; stockPurchasePrice?: number; purchaseCurrency?: string;
}): Investment {
  const now = new Date().toISOString();
  const base = {
    id: Date.now().toString(), type: 'investment' as const,
    name: params.name, amount: params.amount, currency: 'CNY' as const,
    cost: params.cost, costBasis: 'AVG' as const,
    lastPrice: params.amount / (params.share ?? 1),
    dailyPnl: 0, totalPnl: params.amount - params.cost,
    dailyReturn: params.cost > 0 ? ((params.amount - params.cost) / params.cost) * 100 : 0,
    createdAt: now, updatedAt: now,
  };
  switch (params.subtype) {
    case 'gold': return { ...base, lastPrice: params.purchasePrice ?? 0, subtype: 'gold', productType: (params.productType as any) ?? '纸黄金', purchasePrice: params.purchasePrice ?? 0, quantity: params.quantity ?? 0, purchaseDate: params.purchaseDate ?? now.split('T')[0], brand: params.brand };
    case 'yuebao': return { ...base, subtype: 'yuebao', share: params.share ?? params.cost, incomeYesterday: params.incomeYesterday ?? 0, sevenDayYield: params.sevenDayYield ?? 0 };
    case 'fund': return { ...base, subtype: 'fund', fundCode: params.fundCode ?? '', share: params.fundShare ?? 0, netValue: params.netValue ?? params.purchaseCost ?? 1, purchaseCost: params.purchaseCost ?? 1 };
    case 'cn-stock': return { ...base, subtype: 'cn-stock', stockCode: params.stockCode ?? '', share: params.stockShare ?? 0, purchasePrice: params.stockPurchasePrice ?? 0 };
    case 'hk-stock': return { ...base, subtype: 'hk-stock', stockCode: params.stockCode ?? '', share: params.stockShare ?? 0, purchasePrice: params.stockPurchasePrice ?? 0, purchaseCurrency: (params.purchaseCurrency as 'HKD' | 'CNY') ?? 'HKD' };
    default: throw new Error(`Unknown subtype: ${params.subtype}`);
  }
}
