// 添加资产页面 — Apple 风格表单 + AI 图片导入

import { useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import { analyzeImage } from '../src/services/imageImport';

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
  const [importing, setImporting] = useState(false);

  const subtypes = type === 'cash' ? cashSubtypes : fixedSubtypes;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('错误', '请输入资产名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('错误', '请输入有效金额'); return; }

    const asset = {
      id: Date.now().toString(), type, subtype,
      name: name.trim(), amount: parseFloat(amount),
      note: note.trim() || undefined, currency: 'CNY',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const existing = await AsyncStorage.getItem('@assets_tracker/assets');
    const assets = existing ? JSON.parse(existing) : [];
    assets.push(asset);
    await AsyncStorage.setItem('@assets_tracker/assets', JSON.stringify(assets));
    router.back();
  };

  // AI 图片导入
  const handleImageImport = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('提示', '需要相册权限才能选择截图'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setImporting(true);
      const asset = result.assets[0];
      const base64: string = asset.base64 ?? '';
      const mimeType: string = asset.mimeType ?? 'image/jpeg';
      if (!base64) { Alert.alert('错误', '无法读取图片数据'); setImporting(false); return; }
      const recognized = await analyzeImage(base64, mimeType);

      if (recognized) {
        // 自动填入识别结果
        if (recognized.name) setName(recognized.name);
        if (recognized.amount) setAmount(String(recognized.amount));
        if (recognized.note) setNote(recognized.note);
        if (recognized.type === 'cash' || recognized.type === 'fixed') {
          setType(recognized.type);
          if (recognized.subtype) setSubtype(recognized.subtype);
        }
        Alert.alert('识别成功', '已自动填入识别结果，请检查并修改');
      } else {
        Alert.alert('识别失败', '未能识别截图中的资产信息，请手动输入');
      }
    } catch (e: any) {
      Alert.alert('错误', e.message || '图片识别失败');
    } finally {
      setImporting(false);
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
        title={importing ? '识别中...' : '截图导入'}
        onPress={handleImageImport}
        variant="secondary"
        fullWidth
        loading={importing}
        icon={!importing ? <Ionicons name="camera" size={20} color={colors.primary} /> : undefined}
        style={{ marginBottom: spacing.md }}
      />

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
        <SegmentedControl segments={subtypes} selected={subtype} onValueChange={setSubtype} />

        {/* 名称 */}
        <View style={{ marginTop: spacing.md }}>
          <AppleTextInput label="资产名称" value={name} onChangeText={setName} placeholder="例如：招商银行储蓄卡" />
        </View>

        {/* 备注 */}
        <AppleTextInput label="备注（可选）" value={note} onChangeText={setNote} placeholder="添加备注信息" multiline />

        {/* 金额 */}
        <AppleTextInput label="金额（¥）" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      </AppleCard>

      <AppleButton title="保存" onPress={handleSave} fullWidth />
    </ScrollView>
  );
}
