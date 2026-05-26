// 添加投资页面

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const subtypes = [{ value: 'gold', label: '黄金' }, { value: 'yuebao', label: '余额宝' }, { value: 'fund', label: '基金' }, { value: 'cn-stock', label: 'A股' }, { value: 'hk-stock', label: '港股' }];

export default function AddInvestmentScreen() {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.label}>产品类型</Text>
          <View style={styles.subtypeGrid}>
            {subtypes.map(s => (
              <Button key={s.value} mode={subtype === s.value ? 'contained' : 'outlined'} onPress={() => setSubtype(s.value)} style={styles.subtypeBtn} buttonColor={subtype === s.value ? '#00d9ff' : 'transparent'} textColor={subtype === s.value ? '#1a1a2e' : '#888'} compact>{s.label}</Button>
            ))}
          </View>
          <Text style={styles.label}>产品名称</Text>
          <TextInput value={name} onChangeText={setName} placeholder="例如：Au99.99纸黄金" placeholderTextColor="#555" style={styles.input} mode="outlined" outlineColor="#2a2a4e" activeOutlineColor="#00d9ff" textColor="#fff" />
          {(subtype === 'fund' || subtype === 'cn-stock' || subtype === 'hk-stock') && (
            <>
              <Text style={styles.label}>产品代码 (可选)</Text>
              <TextInput value={code} onChangeText={setCode} placeholder="例如：510300 或 600539" placeholderTextColor="#555" style={styles.input} mode="outlined" outlineColor="#2a2a4e" activeOutlineColor="#00d9ff" textColor="#fff" />
            </>
          )}
          <Text style={styles.label}>当前市值 (CNY)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#555" keyboardType="decimal-pad" style={styles.input} mode="outlined" outlineColor="#2a2a4e" activeOutlineColor="#00d9ff" textColor="#fff" />
          <Text style={styles.label}>总成本 (CNY)</Text>
          <TextInput value={cost} onChangeText={setCost} placeholder="买入时的总成本" placeholderTextColor="#555" keyboardType="decimal-pad" style={styles.input} mode="outlined" outlineColor="#2a2a4e" activeOutlineColor="#00d9ff" textColor="#fff" />
        </Card.Content>
      </Card>
      <Button mode="contained" onPress={handleSave} style={styles.saveBtn} buttonColor="#00d9ff" textColor="#1a1a2e">保存</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  content: { padding: 16 },
  card: { backgroundColor: '#1a1a2e', marginBottom: 16 },
  label: { color: '#888', fontSize: 14, marginTop: 16, marginBottom: 8 },
  subtypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subtypeBtn: { borderColor: '#2a2a4e' },
  input: { backgroundColor: '#1a1a2e', marginBottom: 8 },
  saveBtn: { marginTop: 16 },
});