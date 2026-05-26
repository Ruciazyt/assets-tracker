// 添加资产页面

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, SegmentedButtons, Card } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cashSubtypes = [{ value: 'cash', label: '现金' }, { value: 'bank', label: '银行' }, { value: 'alipay', label: '支付宝' }, { value: 'wechat', label: '微信' }];
const fixedSubtypes = [{ value: 'property', label: '房产' }, { value: 'vehicle', label: '车辆' }, { value: 'equipment', label: '设备' }];

export default function AddAssetScreen() {
  const [type, setType] = useState<'cash' | 'fixed'>('cash');
  const [subtype, setSubtype] = useState('bank');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const subtypes = type === 'cash' ? cashSubtypes : fixedSubtypes;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入资产名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入有效金额'); return; }

    const asset = { id: Date.now().toString(), type, subtype, name: name.trim(), amount: parseFloat(amount), currency: 'CNY' };
    const existing = await AsyncStorage.getItem('@assets_tracker/assets');
    const assets = existing ? JSON.parse(existing) : [];
    assets.push(asset);
    await AsyncStorage.setItem('@assets_tracker/assets', JSON.stringify(assets));
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.label}>资产类型</Text>
          <SegmentedButtons value={type} onValueChange={(val) => { setType(val as 'cash' | 'fixed'); setSubtype(val === 'cash' ? 'bank' : 'property'); }} buttons={[{ value: 'cash', label: '流动资金' }, { value: 'fixed', label: '固定资产' }]} style={styles.segmented} />
          <Text style={styles.label}>子类型</Text>
          <SegmentedButtons value={subtype} onValueChange={setSubtype} buttons={subtypes.map(s => ({ value: s.value, label: s.label }))} style={styles.segmented} />
          <Text style={styles.label}>资产名称</Text>
          <TextInput value={name} onChangeText={setName} placeholder="例如：招商银行储蓄卡" placeholderTextColor="#555" style={styles.input} mode="outlined" outlineColor="#2a2a4e" activeOutlineColor="#00d9ff" textColor="#fff" />
          <Text style={styles.label}>金额 (CNY)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#555" keyboardType="decimal-pad" style={styles.input} mode="outlined" outlineColor="#2a2a4e" activeOutlineColor="#00d9ff" textColor="#fff" />
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
  segmented: { marginBottom: 8 },
  input: { backgroundColor: '#1a1a2e', marginBottom: 8 },
  saveBtn: { marginTop: 16 },
});