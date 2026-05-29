// 截图解析导入页面

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from '../src/i18n/LanguageContext';

import { parseScreenshot, ParsedReceipt } from '../src/services/parser/ocr';

export default function ImportScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
      Alert.alert(t('import.permissionPhoto'), t('import.permissionPhotoDesc'));
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
      Alert.alert(t('import.permissionCamera'), t('import.permissionCameraDesc'));
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
      Alert.alert(t('common.error'), t('import.noImage'));
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseScreenshot(imageUri);
      setResult(parsed);
      if (parsed?.amount) {
        setAmount(parsed.amount.toString());
      }
      if (parsed?.name) {
        setName(parsed.name);
      }
    } catch (e) {
      Alert.alert(t('import.parseError'), t('import.parseErrorDesc'));
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common.error'), t('import.nameRequired')); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert(t('common.error'), t('import.amountRequired')); return; }

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

    Alert.alert(t('import.success'), t('import.saved'), [
      { text: t('common.confirm'), onPress: () => router.back() },
    ]);
  };

  const subtypes = type === 'investment'
    ? [{ value: 'gold', label: t('addInv.gold') }, { value: 'yuebao', label: t('addInv.yuebao') }, { value: 'fund', label: t('addInv.fund') }, { value: 'cn-stock', label: t('addInv.cnStock') }, { value: 'hk-stock', label: t('addInv.hkStock') }]
    : [{ value: 'cash', label: t('addAsset.cash') }, { value: 'bank', label: t('addAsset.bank') }, { value: 'alipay', label: t('addAsset.alipay') }, { value: 'wechat', label: t('addAsset.wechat') }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📷 {t('import.title')}</Text>
          <View style={styles.imageRow}>
            <Button mode="outlined" onPress={pickImage} textColor={colors.accent} style={styles.imgBtn} buttonColor="transparent">📁 {t('import.pickImage')}</Button>
            <Button mode="outlined" onPress={takePhoto} textColor={colors.accent} style={styles.imgBtn} buttonColor="transparent">📷 {t('import.takePhoto')}</Button>
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
            {parsing ? '...' : '🔍 ' + t('import.parse')}
          </Button>

          {parsing && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>{t('import.parsing')}</Text>
          )}
        </Card.Content>
      </Card>

      {result && (
        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 {t('import.result')}</Text>
            <View style={[styles.resultBox, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.resultType, { color: colors.textSecondary }]}>Type: {result.type}</Text>
              {result.amount && <Text style={[styles.resultAmount, { color: colors.gain }]}>Amount: ¥{result.amount.toLocaleString()}</Text>}
              {result.currency && <Text style={[styles.resultCurrency, { color: colors.textSecondary }]}>Currency: {result.currency}</Text>}
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>✏️ {t('common.confirm')} {t('import.save')}</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
          <View style={styles.typeRow}>
            <Button
              mode={type === 'investment' ? 'contained' : 'outlined'}
              onPress={() => { setType('investment'); setSubtype('gold'); }}
              style={styles.typeBtn}
              buttonColor={type === 'investment' ? colors.accent : 'transparent'}
              textColor={type === 'investment' ? colors.accentText : colors.textMuted}
            >💰 {t('import.investment')}</Button>
            <Button
              mode={type === 'cash' ? 'contained' : 'outlined'}
              onPress={() => { setType('cash'); setSubtype('bank'); }}
              style={styles.typeBtn}
              buttonColor={type === 'cash' ? colors.accent : 'transparent'}
              textColor={type === 'cash' ? colors.accentText : colors.textMuted}
            >💵 {t('import.cash')}</Button>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gold ETF account"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.cardSecondary }]}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.accent}
            textColor={colors.text}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (CNY)</Text>
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
      >💾 {t('import.save')}</Button>
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