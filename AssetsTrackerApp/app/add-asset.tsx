// 添加资产页面

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, SegmentedButtons, Card } from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';

const cashSubtypes = [{ value: 'cash', label: '现金' }, { value: 'bank', label: '银行' }, { value: 'alipay', label: '支付宝' }, { value: 'wechat', label: '微信' }];
const fixedSubtypes = [{ value: 'property', label: '房产' }, { value: 'vehicle', label: '车辆' }, { value: 'equipment', label: '设备' }];

export default function AddAssetScreen() {
  const { colors } = useTheme();
  const [type, setType] = useState<'cash' | 'fixed'>('cash');
  const [subtype, setSubtype] = useState('bank');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  const subtypes = type === 'cash' ? cashSubtypes : fixedSubtypes;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入资产名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入有效金额'); return; }

    const asset = {
      id: Date.now().toString(),
      type,
      subtype,
      name: name.trim(),
      amount: parseFloat(amount),
      note: note.trim() || undefined,
      currency: 'CNY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existing = await AsyncStorage.getItem('@assets_tracker/assets');
    const assets = existing ? JSON.parse(existing) : [];
    assets.push(asset);
    await AsyncStorage.setItem('@assets_tracker/assets', JSON.stringify(assets));
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.label, { color: colors.textSecondary }]}>资产类型</Text>
          <SegmentedButtons value={type} onValueChange={(val) => { setType(val as 'cash' | 'fixed'); setSubtype(val === 'cash' ? 'bank' : 'property'); }} buttons={[{ value: 'cash', label: '流动资金' }, { value: 'fixed', label: '固定资产' }]} style={styles.segmented} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>子类型</Text>
          <SegmentedButtons value={subtype} onValueChange={setSubtype} buttons={subtypes.map(s => ({ value: s.value, label: s.label }))} style={styles.segmented} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>资产名称</Text>
          <TextInput value={name} onChangeText={setName} placeholder="例如：招商银行储蓄卡" placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>备注 (可选)</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="添加备注信息" placeholderTextColor={colors.textMuted} style={[styles.input, styles.noteInput, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} multiline numberOfLines={2} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>金额 (CNY)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: colors.card }]} mode="outlined" outlineColor={colors.border} activeOutlineColor={colors.accent} textColor={colors.text} />
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
  segmented: { marginBottom: 8 },
  input: { marginBottom: 8 },
  noteInput: { minHeight: 60 },
  saveBtn: { marginTop: 16 },
});