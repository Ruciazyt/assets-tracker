// 截图解析导入页面

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';

import { parseScreenshot, ParsedReceipt } from '../src/services/parser/ocr';

export default function ImportScreen() {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedReceipt | null>(null);

  // 表单字段
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'investment' | 'cash'>('investment');
  const [subtype, setSubtype] = useState('gold');

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限来选择截图');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限来拍照');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const handleParse = async () => {
    if (!imageUri) {
      Alert.alert('请先选择图片');
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseScreenshot(imageUri);
      setResult(parsed);
      if (parsed?.amount) {
        setAmount(parsed.amount.toString());
      }
    } catch (e) {
      Alert.alert('解析失败', '无法识别截图中的内容，请尝试手动输入');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('请输入名称'); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('请输入金额'); return; }

    const asset = {
      id: Date.now().toString(),
      type,
      name: name.trim(),
      subtype,
      amount: parseFloat(amount),
      currency: 'CNY',
      note: result?.raw ? `OCR识别: ${result.raw.slice(0, 100)}` : undefined,
    };

    const key = type === 'investment' ? '@assets_tracker/investments' : '@assets_tracker/assets';
    const existing = await AsyncStorage.getItem(key);
    const list = existing ? JSON.parse(existing) : [];
    list.push(asset);
    await AsyncStorage.setItem(key, JSON.stringify(list));

    Alert.alert('导入成功', '数据已保存', [
      { text: '确定', onPress: () => router.back() }
    ]);
  };

  const subtypes = type === 'investment'
    ? [{ value: 'gold', label: '黄金' }, { value: 'yuebao', label: '余额宝' }, { value: 'fund', label: '基金' }, { value: 'cn-stock', label: 'A股' }, { value: 'hk-stock', label: '港股' }]
    : [{ value: 'cash', label: '现金' }, { value: 'bank', label: '银行存款' }, { value: 'alipay', label: '支付宝' }, { value: 'wechat', label: '微信' }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📷 选择截图</Text>
          <View style={styles.imageRow}>
            <Button mode="outlined" onPress={pickImage} textColor={colors.accent} style={styles.imgBtn} buttonColor="transparent">📁 从相册选择</Button>
            <Button mode="outlined" onPress={takePhoto} textColor={colors.accent} style={styles.imgBtn} buttonColor="transparent">📷 拍照</Button>
          </View>

          {imageUri && (
            <View style={[styles.previewBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleParse}
            loading={parsing}
            disabled={!imageUri || parsing}
            style={[styles.parseBtn, { backgroundColor: colors.accent }]}
            buttonColor={colors.accent}
            textColor={colors.accentText}
          >
            {parsing ? '解析中...' : '🔍 解析截图'}
          </Button>

          {parsing && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>解析需要几秒钟，请耐心等待</Text>
          )}
        </Card.Content>
      </Card>

      {result && (
        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 解析结果</Text>
            <View style={[styles.resultBox, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.resultType, { color: colors.textSecondary }]}>类型: {result.type}</Text>
              {result.amount && <Text style={[styles.resultAmount, { color: colors.gain }]}>金额: ¥{result.amount.toLocaleString()}</Text>}
              {result.currency && <Text style={[styles.resultCurrency, { color: colors.textSecondary }]}>货币: {result.currency}</Text>}
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>✏️ 确认并保存</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>资产类型</Text>
          <View style={styles.typeRow}>
            <Button
              mode={type === 'investment' ? 'contained' : 'outlined'}
              onPress={() => { setType('investment'); setSubtype('gold'); }}
              style={styles.typeBtn}
              buttonColor={type === 'investment' ? colors.accent : 'transparent'}
              textColor={type === 'investment' ? colors.accentText : colors.textMuted}
            >💰 投资</Button>
            <Button
              mode={type === 'cash' ? 'contained' : 'outlined'}
              onPress={() => { setType('cash'); setSubtype('bank'); }}
              style={styles.typeBtn}
              buttonColor={type === 'cash' ? colors.accent : 'transparent'}
              textColor={type === 'cash' ? colors.accentText : colors.textMuted}
            >💵 流动资金</Button>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>子类型</Text>
          <View style={styles.subtypeGrid}>
            {subtypes.map(s => (
              <Button
                key={s.value}
                mode={subtype === s.value ? 'contained' : 'outlined'}
                onPress={() => setSubtype(s.value)}
                style={styles.subBtn}
                buttonColor={subtype === s.value ? colors.accent : 'transparent'}
                textColor={subtype === s.value ? colors.accentText : colors.textMuted}
                compact
              >{s.label}</Button>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>名称</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="例如：纸黄金账户"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.cardSecondary }]}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.accent}
            textColor={colors.text}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>金额 (CNY)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: colors.cardSecondary }]}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.accent}
            textColor={colors.text}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        style={[styles.saveBtn, { backgroundColor: colors.gain }]}
        buttonColor={colors.gain}
        textColor="#fff"
      >💾 保存到资产</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  imageRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  imgBtn: { flex: 1, borderColor: '#2a2a4e' },
  previewBox: { borderRadius: 8, marginBottom: 12, alignItems: 'center', padding: 8 },
  preview: { width: '100%', height: 200, borderRadius: 8 },
  parseBtn: { marginTop: 4 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  resultBox: { borderRadius: 8, padding: 12 },
  resultType: { fontSize: 14 },
  resultAmount: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  resultCurrency: { fontSize: 14, marginTop: 4 },
  label: { fontSize: 14, marginTop: 12, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, borderColor: '#2a2a4e' },
  subtypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subBtn: { borderColor: '#2a2a4e' },
  input: { marginBottom: 8 },
  saveBtn: { marginBottom: 32 },
});