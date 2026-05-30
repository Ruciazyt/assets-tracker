// 添加资产页面 — Apple 风格表单

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import SectionHeader from '../src/components/SectionHeader';

const cashSubtypes = [
  { value: 'cash', label: '现金' },
  { value: 'bank', label: '银行' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
];
const fixedSubtypes = [
  { value: 'property', label: '房产' },
  { value: 'vehicle', label: '车辆' },
  { value: 'equipment', label: '设备' },
];

export default function AddAssetScreen() {
  const { colors, spacing, typography } = useAppTheme();
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.parchment }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        {/* 资产类型 */}
        <Text style={[typography.captionStrong, { color: colors.textMuted, marginBottom: spacing.xs }]}>资产类型</Text>
        <SegmentedControl
          segments={[
            { label: '流动资金', value: 'cash' },
            { label: '固定资产', value: 'fixed' },
          ]}
          selected={type}
          onValueChange={v => { setType(v as 'cash' | 'fixed'); setSubtype(v === 'cash' ? 'bank' : 'property'); }}
        />

        {/* 子类型 */}
        <Text style={[typography.captionStrong, { color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm }]}>子类型</Text>
        <SegmentedControl
          segments={subtypes}
          selected={subtype}
          onValueChange={setSubtype}
        />

        {/* 名称 */}
        <View style={{ marginTop: spacing.md }}>
          <AppleTextInput
            label="资产名称"
            value={name}
            onChangeText={setName}
            placeholder="例如：招商银行储蓄卡"
          />
        </View>

        {/* 备注 */}
        <AppleTextInput
          label="备注（可选）"
          value={note}
          onChangeText={setNote}
          placeholder="添加备注信息"
          multiline
        />

        {/* 金额 */}
        <AppleTextInput
          label="金额（¥）"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </AppleCard>

      <AppleButton title="保存" onPress={handleSave} fullWidth />
    </ScrollView>
  );
}
