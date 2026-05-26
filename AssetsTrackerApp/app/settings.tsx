// 设置页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const currencies = ['CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP'];

export default function SettingsScreen() {
  const [defaultCurrency, setDefaultCurrency] = useState('CNY');
  const [jpyRate, setJpyRate] = useState<number | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('@assets_tracker/settings');
      if (settings) setDefaultCurrency(JSON.parse(settings).defaultCurrency || 'CNY');
    } catch (e) {}
  };

  const handleCurrencyChange = async (currency: string) => {
    setDefaultCurrency(currency);
    await AsyncStorage.setItem('@assets_tracker/settings', JSON.stringify({ defaultCurrency: currency }));
    Alert.alert('成功', `默认货币已设置为 ${currency}`);
  };

  const handleClearData = () => {
    Alert.alert('确认清除', '确定要清除所有数据吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '清除', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['@assets_tracker/assets', '@assets_tracker/investments']);
        Alert.alert('成功', '所有数据已清除');
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>货币设置</Text>
          <Text style={styles.sectionDesc}>设置默认显示货币</Text>
          <View style={styles.currencyGrid}>
            {currencies.map(c => (
              <TouchableOpacity key={c} style={[styles.currencyBtn, defaultCurrency === c && styles.currencyBtnActive]} onPress={() => handleCurrencyChange(c)}>
                <Text style={[styles.currencyBtnText, defaultCurrency === c && styles.currencyBtnTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>清除所有数据</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>关于</Text>
          <Text style={styles.aboutTitle}>Assets Tracker</Text>
          <Text style={styles.aboutVersion}>版本 1.0.0</Text>
          <Text style={styles.aboutDesc}>资产追踪器 - 帮助您管理流动资金、固定资产和理财产品</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e' },
  content: { padding: 16 },
  card: { backgroundColor: '#1a1a2e', marginBottom: 16, borderRadius: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionDesc: { color: '#888', fontSize: 14, marginBottom: 16 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyBtn: { backgroundColor: '#252540', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  currencyBtnActive: { backgroundColor: '#6366f1' },
  currencyBtnText: { color: '#888', fontSize: 14 },
  currencyBtnTextActive: { color: '#fff', fontWeight: '600' },
  dangerBtn: { backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  aboutTitle: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  aboutVersion: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'center' },
  aboutDesc: { color: '#666', fontSize: 12, marginTop: 8, textAlign: 'center' },
});