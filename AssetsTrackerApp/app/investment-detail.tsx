// 投资详情/编辑页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StyleProp, ViewStyle } from 'react-native';
import { TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from '../src/i18n/LanguageContext';
import { Investment } from '../src/types/investment';

export default function InvestmentDetailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Form state — mirrors add-investment.tsx field names
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  // gold
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [productType, setProductType] = useState<'实物金' | '纸黄金' | 'ETF基金'>('纸黄金');
  // yuebao
  const [yuebaoShare, setYuebaoShare] = useState('');
  const [incomeYesterday, setIncomeYesterday] = useState('');
  const [sevenDayYield, setSevenDayYield] = useState('');
  // fund
  const [fundCode, setFundCode] = useState('');
  const [fundShare, setFundShare] = useState('');
  const [netValue, setNetValue] = useState('');
  // stock (cn + hk)
  const [stockCode, setStockCode] = useState('');
  const [stockShare, setStockShare] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'HKD' | 'CNY'>('HKD');

  useEffect(() => {
    loadInvestment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInvestment = async () => {
    try {
      const raw = await AsyncStorage.getItem('@assets_tracker/investments');
      const list: Investment[] = raw ? JSON.parse(raw) : [];
      const found = list.find(inv => inv.id === id);
      if (!found) {
        Alert.alert(t('common.error'), 'Investment not found', [{ text: t('common.cancel'), onPress: () => router.back() }]);
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
    } else if (inv.subtype === 'cn-stock') {
      setStockCode(inv.stockCode || '');
      setStockShare(String(inv.share));
      setStockPurchasePrice(String(inv.purchasePrice));
    } else if (inv.subtype === 'hk-stock') {
      setStockCode(inv.stockCode || '');
      setStockShare(String(inv.share));
      setStockPurchasePrice(String(inv.purchasePrice));
      setPurchaseCurrency(inv.purchaseCurrency || 'HKD');
    }
  };

  const handleSave = async () => {
    if (!investment) return;
    if (!name.trim()) { Alert.alert(t('common.error'), t('common.errNameReq')); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert(t('common.error'), t('common.errAmountReq')); return; }
    if (!cost || parseFloat(cost) <= 0) { Alert.alert(t('common.error'), t('common.errCostReq')); return; }

    const a = parseFloat(amount);
    const c = parseFloat(cost);

    const updated: Investment = {
      ...investment,
      name: name.trim(),
      amount: a,
      cost: c,
      lastPrice: a / (investment.subtype === 'yuebao' ? parseFloat(yuebaoShare) || c : (investment.subtype === 'fund' ? parseFloat(fundShare) || 1 : 1)),
      totalPnl: a - c,
      dailyReturn: c > 0 ? ((a - c) / c) * 100 : 0,
      updatedAt: new Date().toISOString(),
      // gold
      ...(investment.subtype === 'gold' && {
        purchasePrice: parseFloat(purchasePrice) || 0,
        quantity: parseFloat(quantity) || 0,
        purchaseDate: purchaseDate || investment.purchaseDate,
        productType,
      }),
      // yuebao
      ...(investment.subtype === 'yuebao' && {
        share: parseFloat(yuebaoShare) || c,
        incomeYesterday: parseFloat(incomeYesterday) || 0,
        sevenDayYield: parseFloat(sevenDayYield) || 0,
      }),
      // fund
      ...(investment.subtype === 'fund' && {
        fundCode: fundCode.trim(),
        share: parseFloat(fundShare) || 0,
        netValue: parseFloat(netValue) || 0,
      }),
      // cn/hk stock
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
      if (idx === -1) { Alert.alert(t('common.error'), 'Investment not found'); return; }
      list[idx] = updated;
      await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(list));
      setInvestment(updated);
      setEditMode(false);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.errSave') + String(e));
    }
  };

  const handleDelete = () => {
    Alert.alert(t('common.deleteConfirm'), t('common.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const raw = await AsyncStorage.getItem('@assets_tracker/investments');
          const list: Investment[] = raw ? JSON.parse(raw) : [];
          const filtered = list.filter(inv => inv.id !== id);
          await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(filtered));
          router.back();
        },
      },
    ]);
  };

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

  const formatCurrency = (v: number) => '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  const formatPercent = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  if (!investment) return null;

  const subtypeMap: Record<string, string> = {
    gold: t('addInv.gold'),
    yuebao: t('addInv.yuebao'),
    fund: t('addInv.fund'),
    'cn-stock': t('addInv.cnStock'),
    'hk-stock': t('addInv.hkStock'),
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.invName, { color: colors.text }]}>{investment.name}</Text>
              <Text style={[styles.invSubtype, { color: colors.textMuted }]}>
                {subtypeMap[investment.subtype] || investment.subtype}
              </Text>
            </View>
            {!editMode && (
              <Button
                mode="outlined"
                onPress={() => setEditMode(true)}
                textColor={colors.accent}
                style={{ borderColor: colors.accent }}
                compact
              >{t('common.edit')}</Button>
            )}
          </View>

          {/* ── View mode ── */}
          {!editMode && (
            <>
              {/* Price & P&L */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('addInv.amount')}</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(investment.amount)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('addInv.cost')}</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(investment.cost)}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('investments.dailyChange')}</Text>
                  <Text style={[styles.statValue, { color: (investment.dailyReturn || 0) >= 0 ? colors.gain : colors.loss }]}>
                    {formatPercent(investment.dailyReturn || 0)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('investments.totalPnl')}</Text>
                  <Text style={[styles.statValue, { color: investment.totalPnl >= 0 ? colors.gain : colors.loss }]}>
                    {formatCurrency(investment.totalPnl)}
                  </Text>
                </View>
              </View>

              {/* Subtype-specific details */}
              {investment.subtype === 'gold' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.productType')}</Text>
                    <Text style={styles.detailValue}>{investment.productType}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.purchasePrice')}</Text>
                    <Text style={styles.detailValue}>¥{investment.purchasePrice?.toFixed(2)}/g</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.quantity')}</Text>
                    <Text style={styles.detailValue}>{investment.quantity} g</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.purchaseDate')}</Text>
                    <Text style={styles.detailValue}>{investment.purchaseDate}</Text>
                  </View>
                </>
              )}

              {investment.subtype === 'yuebao' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.fundShare')}</Text>
                    <Text style={styles.detailValue}>{investment.share.toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.yesterdayIncome')}</Text>
                    <Text style={styles.detailValue}>{formatCurrency(investment.incomeYesterday)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.sevenDayYield')}</Text>
                    <Text style={styles.detailValue}>{investment.sevenDayYield?.toFixed(4)}%</Text>
                  </View>
                </>
              )}

              {investment.subtype === 'fund' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.fundCode')}</Text>
                    <Text style={styles.detailValue}>{investment.fundCode}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.fundShare')}</Text>
                    <Text style={styles.detailValue}>{investment.share}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.purchaseCost')}</Text>
                    <Text style={styles.detailValue}>¥{investment.netValue?.toFixed(4) || '—'}</Text>
                  </View>
                </>
              )}

              {(investment.subtype === 'cn-stock' || investment.subtype === 'hk-stock') && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.stockCode')}</Text>
                    <Text style={styles.detailValue}>{investment.stockCode}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.stockShare')}</Text>
                    <Text style={styles.detailValue}>{investment.share}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('addInv.stockPrice')}</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(investment.purchasePrice)}
                      {investment.subtype === 'hk-stock' && ` ${investment.purchaseCurrency}`}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}

          {/* ── Edit mode ── */}
          {editMode && (
            <>
              {makeInput(t('addInv.name'), name, setName, 'e.g. Huaan Gold ETF')}
              {makeInput(t('addInv.amount') + ' (¥)', amount, setAmount, 'Current total value', 'decimal-pad')}
              {makeInput(t('addInv.cost') + ' (¥)', cost, setCost, 'Total cost', 'decimal-pad')}

              {/* Gold */}
              {investment.subtype === 'gold' && (
                <>
                  <Text style={labelStyle}>{t('addInv.productType')}</Text>
                  <SegmentedButtons
                    value={productType}
                    onValueChange={v => setProductType(v as typeof productType)}
                    buttons={[
                      { value: '实物金', label: t('addInv.gold') },
                      { value: '纸黄金', label: t('addInv.gold') + ' 2' },
                      { value: 'ETF基金', label: 'ETF' },
                    ]}
                    style={{ marginBottom: 8 }}
                  />
                  {makeInput(t('addInv.purchasePrice') + ' (¥/g)', purchasePrice, setPurchasePrice, 'e.g. 520.5', 'decimal-pad')}
                  {makeInput(t('addInv.quantity') + ' (g)', quantity, setQuantity, 'e.g. 10', 'decimal-pad')}
                  {makeInput(t('addInv.purchaseDate'), purchaseDate, setPurchaseDate, 'YYYY-MM-DD')}
                </>
              )}

              {/* YuEBao */}
              {investment.subtype === 'yuebao' && (
                <>
                  {makeInput(t('addInv.fundShare'), yuebaoShare, setYuebaoShare, 'Share amount', 'decimal-pad')}
                  {makeInput(t('addInv.yesterdayIncome'), incomeYesterday, setIncomeYesterday, 'e.g. 1.23', 'decimal-pad')}
                  {makeInput(t('addInv.sevenDayYield'), sevenDayYield, setSevenDayYield, 'e.g. 1.85', 'decimal-pad')}
                </>
              )}

              {/* Fund */}
              {investment.subtype === 'fund' && (
                <>
                  {makeInput(t('addInv.fundCode'), fundCode, setFundCode, 'e.g. 510300')}
                  {makeInput(t('addInv.fundShare'), fundShare, setFundShare, 'e.g. 1000', 'decimal-pad')}
                  {makeInput(t('addInv.purchaseCost'), netValue, setNetValue, 'NAV', 'decimal-pad')}
                </>
              )}

              {/* CN Stock */}
              {investment.subtype === 'cn-stock' && (
                <>
                  {makeInput(t('addInv.stockCode'), stockCode, setStockCode, 'e.g. 600539')}
                  {makeInput(t('addInv.stockShare'), stockShare, setStockShare, 'e.g. 100', 'decimal-pad')}
                  {makeInput(t('addInv.stockPrice') + ' (¥)', stockPurchasePrice, setStockPurchasePrice, 'Purchase price', 'decimal-pad')}
                </>
              )}

              {/* HK Stock */}
              {investment.subtype === 'hk-stock' && (
                <>
                  {makeInput(t('addInv.stockCode'), stockCode, setStockCode, 'e.g. 00700')}
                  {makeInput(t('addInv.stockShare'), stockShare, setStockShare, 'e.g. 100', 'decimal-pad')}
                  {makeInput(t('addInv.stockPrice') + ' (HKD)', stockPurchasePrice, setStockPurchasePrice, 'Purchase price', 'decimal-pad')}
                  <Text style={labelStyle}>{t('addInv.currency')}</Text>
                  <SegmentedButtons
                    value={purchaseCurrency}
                    onValueChange={v => setPurchaseCurrency(v as 'HKD' | 'CNY')}
                    buttons={[
                      { value: 'HKD', label: 'HKD' },
                      { value: 'CNY', label: 'CNY' },
                    ]}
                    style={{ marginBottom: 8 }}
                  />
                </>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Action buttons */}
      {editMode ? (
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            onPress={() => { setEditMode(false); populateForm(investment); }}
            textColor={colors.textMuted}
            style={{ flex: 1, marginRight: 8 }}
          >{t('common.cancel')}</Button>
          <Button
            mode="contained"
            onPress={handleSave}
            buttonColor={colors.accent}
            textColor={colors.accentText}
            style={{ flex: 1 }}
          >{t('common.save')}</Button>
        </View>
      ) : (
        <Button
          mode="outlined"
          onPress={handleDelete}
          textColor={colors.loss}
          style={[styles.deleteBtn, { borderColor: colors.loss }]}
        >{t('common.delete')}</Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, borderRadius: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flex: 1 },
  invName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  invSubtype: { fontSize: 14 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#333', marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { color: '#aaa', fontSize: 14 },
  detailValue: { color: '#eee', fontSize: 14, fontWeight: '500' },
  input: { marginBottom: 6 },
  actionRow: { flexDirection: 'row' },
  deleteBtn: { marginTop: 8, borderColor: '#e00' },
});