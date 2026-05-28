// 设置页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../src/context/ThemeContext';

const currencies = ['CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP'];

const refreshOptions = [
  { label: '关闭', value: 0 },
  { label: '15秒', value: 15 },
  { label: '30秒', value: 30 },
  { label: '60秒', value: 60 },
  { label: '5分钟', value: 300 },
];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [defaultCurrency, setDefaultCurrency] = useState('CNY');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('@assets_tracker/settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDefaultCurrency(parsed.defaultCurrency || 'CNY');
        setRefreshInterval(Number(parsed.refreshInterval ?? 0));
      }
    } catch (e) {}
  };

  const handleCurrencyChange = async (currency: string) => {
    setDefaultCurrency(currency);
    const existing = await AsyncStorage.getItem('@assets_tracker/settings');
    const updated = { ...JSON.parse(existing || '{}'), defaultCurrency: currency };
    await AsyncStorage.setItem('@assets_tracker/settings', JSON.stringify(updated));
    Alert.alert('成功', `默认货币已设置为 ${currency}`);
  };

  const handleRefreshChange = async (value: number) => {
    setRefreshInterval(value);
    const existing = await AsyncStorage.getItem('@assets_tracker/settings');
    const updated = { ...JSON.parse(existing || '{}'), refreshInterval: value };
    await AsyncStorage.setItem('@assets_tracker/settings', JSON.stringify(updated));
    const label = refreshOptions.find(o => o.value === value)?.label ?? String(value);
    Alert.alert('成功', `自动刷新已设置为 ${label}`);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const assets = await AsyncStorage.getItem('@assets_tracker/assets');
      const investments = await AsyncStorage.getItem('@assets_tracker/investments');
      const settings = await AsyncStorage.getItem('@assets_tracker/settings');

      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        assets: assets ? JSON.parse(assets) : [],
        investments: investments ? JSON.parse(investments) : [],
        settings: settings ? JSON.parse(settings) : {},
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      await Clipboard.setStringAsync(jsonStr);
      Alert.alert('导出成功', `数据已复制到剪贴板，共 ${assets ? JSON.parse(assets).length : 0} 条资产`);
    } catch (e) {
      Alert.alert('导出失败', '无法导出数据，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    Alert.alert('导入数据', '当前版本暂不支持此功能');
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>主题设置</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.themeLabel, { color: colors.text }]}>深色模式</Text>
              <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>{isDark ? '当前：深色主题' : '当前：浅色主题'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#6366f1', true: '#6366f1' }}
              thumbColor={isDark ? '#fff' : '#ccc'}
            />
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>数据自动刷新</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>设置数据自动刷新间隔</Text>
          <View style={styles.refreshGrid}>
            {refreshOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.refreshBtn,
                  { backgroundColor: colors.cardSecondary },
                  refreshInterval === opt.value && { backgroundColor: colors.accent },
                ]}
                onPress={() => handleRefreshChange(opt.value)}
              >
                <Text
                  style={[
                    styles.refreshBtnText,
                    { color: colors.textSecondary },
                    refreshInterval === opt.value && { color: colors.accentText, fontWeight: '600' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>货币设置</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>设置默认显示货币</Text>
          <View style={styles.currencyGrid}>
            {currencies.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyBtn, { backgroundColor: colors.cardSecondary }, defaultCurrency === c && { backgroundColor: colors.accent }]}
                onPress={() => handleCurrencyChange(c)}
              >
                <Text style={[styles.currencyBtnText, { color: colors.textSecondary }, defaultCurrency === c && { color: colors.accentText, fontWeight: '600' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>数据备份</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>导出或导入资产数据</Text>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent }]} onPress={handleExportData} disabled={isExporting}>
            <Text style={[styles.exportBtnText, { color: colors.accentText }]}>{isExporting ? '导出中...' : '📤 导出数据备份'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.importBtn, { backgroundColor: colors.cardSecondary }]} onPress={handleImportData}>
            <Text style={[styles.importBtnText, { color: colors.accent }]}>📥 导入数据备份</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>数据管理</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>🗑️ 清除所有数据</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>关于</Text>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Assets Tracker</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>版本 1.0.0</Text>
          <Text style={[styles.aboutDesc, { color: colors.textMuted }]}>资产追踪器 - 帮助您管理流动资金、固定资产和理财产品</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionDesc: { fontSize: 14, marginBottom: 16 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  themeLabel: { fontSize: 16, fontWeight: '600' },
  themeDesc: { fontSize: 12, marginTop: 2 },
  refreshGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  refreshBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  refreshBtnText: { fontSize: 14 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  currencyBtnText: { fontSize: 14 },
  exportBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  exportBtnText: { fontSize: 15, fontWeight: '600' },
  importBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  importBtnText: { fontSize: 15, fontWeight: '600' },
  dangerBtn: { backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  aboutTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  aboutVersion: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  aboutDesc: { fontSize: 12, marginTop: 8, textAlign: 'center' },
});