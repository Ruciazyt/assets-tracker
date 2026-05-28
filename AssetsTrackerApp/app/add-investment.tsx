// 添加投资页面

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';

const subtypes = [{ value: 'gold', label: '黄金' }, { value: 'yuebao', label: '余额宝' }, { value: 'fund', label: '基金' }, { value: 'cn-stock', label: 'A股' }, { value: 'hk-stock', label: '港股' }];

export default function AddInvestmentScreen() {
  const { colors } = useTheme();
  const [subtype, setSubtype] = useState('gold');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入产品名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入当前市值'); return; }
    if (!cost || parseFloat(cost) <= 0) { Alert.alert('错误', '请输入总成本'); return; }

    const investment = { id: Date.now().toString(), subtype, name: name.trim(), code: code.trim() || undefined, amount: parseFloat(amount), cost: parseFloat(cost), lastPrice: parseFloat(amount) / parseFloat(cost), dailyPnl: 0, totalPnl: parseFloat(amount) - parseFloat(cost), dailyReturn: 0 };
    const existing = await AsyncStorage.getItem('@assets_tracker/investments');
    const investments = existing ? JSON.parse(existing) : [];
    investments.push(investment);
    await AsyncStorage.setItem('@assets_tracker/investments', JSON.stringify(investments));
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.label, { color: colors.textSecondary }]}>产品类型</Text>
          <View style={styles.subtypeGrid}>
            {subtypes.map(s => (
              <Button key={s.value} mode={subtype === s.value ? 'contained' : 'outlined'} onPress={() => setSubtype(s.value)} style={styles.subtypeBtn} buttonColor={subtype === s.value ? colors.accent : 'transparent'} textColor={subtype === s.value ? colors.accentText : colors.textSecondary} compact>{s.label}</Button>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>产品名称</Text>
          <TextInput value={name} onChangeText={setName} placeholder="例如：Au99.99纸黄金" placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} />
          {(subtype === 'fund' || subtype === 'cn-stock' || subtype === 'hk-stock') && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>产品代码 (可选)</Text>
              <TextInput value={code} onChangeText={setCode} placeholder="例如：510300 或 600539" placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} />
            </>
          )}
          <Text style={[styles.label, { color: colors.textSecondary }]}>当前市值 (CNY)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>总成本 (CNY)</Text>
          <TextInput value={cost} onChangeText={setCost} placeholder="买入时的总成本" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} />
        </Card.Content>
      </Card>
      <Button mode="contained" onPress={handleSave} style={styles.saveBtn} buttonColor={colors.accent} textColor={colors.accentText}>保存</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 12 },
  label: { fontSize: 14, marginTop: 16, marginBottom: 8 },
  subtypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subtypeBtn: { borderColor: '#2a2a4e' },
  input: { marginBottom: 8 },
  saveBtn: { marginTop: 16 },
});