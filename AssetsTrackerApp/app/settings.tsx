// 设置页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput, Modal, FlatList } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { getAlertRules, saveAlertRule, deleteAlertRule, toggleAlertRule, AlertRule } from '../src/services/alertService';
import { Investment } from '../src/types/investment';

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
  const { pinEnabled, verifyPin, setupPin, clearPin } = useAuth();
  const [defaultCurrency, setDefaultCurrency] = useState('CNY');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMode, setPinMode] = useState<'setup' | 'disable'>('setup');
  const [pinError, setPinError] = useState('');

  // Alert management state
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertEditRule, setAlertEditRule] = useState<AlertRule | null>(null);
  const [alertInvSelect, setAlertInvSelect] = useState<Investment | null>(null);
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [showInvPicker, setShowInvPicker] = useState(false);
  const [investments, setInvestments] = useState<Investment[]>([]);

  useEffect(() => { loadSettings(); loadAlertRules(); loadInvestments(); }, []);

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

  const loadInvestments = async () => {
    try {
      const raw = await AsyncStorage.getItem('@assets_tracker/investments');
      setInvestments(raw ? JSON.parse(raw) : []);
    } catch {}
  };

  const loadAlertRules = async () => {
    const rules = await getAlertRules();
    setAlertRules(rules);
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
      const investmentsRaw = await AsyncStorage.getItem('@assets_tracker/investments');
      const settings = await AsyncStorage.getItem('@assets_tracker/settings');

      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        assets: assets ? JSON.parse(assets) : [],
        investments: investmentsRaw ? JSON.parse(investmentsRaw) : [],
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

  // --- Alert management ---
  const openNewAlert = () => {
    setAlertEditRule(null);
    setAlertInvSelect(null);
    setAlertDirection('above');
    setAlertTargetPrice('');
    setShowInvPicker(false);
    setShowAlertModal(true);
  };

  const openEditAlert = (rule: AlertRule) => {
    setAlertEditRule(rule);
    const inv = investments.find(i => i.id === rule.investmentId) ?? null;
    setAlertInvSelect(inv);
    setAlertDirection(rule.direction);
    setAlertTargetPrice(String(rule.targetPrice));
    setShowInvPicker(false);
    setShowAlertModal(true);
  };

  const handleSaveAlert = async () => {
    if (!alertInvSelect) {
      Alert.alert('请选择投资品种');
      return;
    }
    const price = parseFloat(alertTargetPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('请输入有效的目标价格');
      return;
    }
    const ruleData = {
      investmentId: alertInvSelect.id,
      investmentName: alertInvSelect.name,
      subtype: alertInvSelect.subtype,
      targetPrice: price,
      direction: alertDirection,
      enabled: true,
      stockCode: (alertInvSelect.subtype === 'cn-stock' || alertInvSelect.subtype === 'hk-stock')
        ? (alertInvSelect as any).stockCode
        : undefined,
      fundCode: alertInvSelect.subtype === 'fund'
        ? (alertInvSelect as any).fundCode
        : undefined,
    };
    if (alertEditRule) {
      await saveAlertRule({ ...ruleData, investmentId: alertEditRule.investmentId });
      await toggleAlertRule(alertEditRule.id, true);
    } else {
      await saveAlertRule(ruleData);
    }
    setShowAlertModal(false);
    loadAlertRules();
  };

  const handleDeleteAlert = async (id: string) => {
    Alert.alert('确认删除', '确定要删除这条提醒吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        await deleteAlertRule(id);
        loadAlertRules();
      }},
    ]);
  };

  const handleToggleAlert = async (id: string, enabled: boolean) => {
    await toggleAlertRule(id, enabled);
    loadAlertRules();
  };

  const subtypeLabel: Record<string, string> = {
    gold: '黄金', yuebao: '余额宝', fund: '基金',
    'cn-stock': 'A股', 'hk-stock': '港股',
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>PIN 保护</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>设置应用锁定 PIN</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.themeLabel, { color: colors.text }]}>PIN 保护</Text>
              <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                {pinEnabled ? '已开启' : '已关闭'}
              </Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={(val) => {
                if (val) {
                  setPinMode('setup');
                  setPinInput('');
                  setPinConfirm('');
                  setPinError('');
                  setShowPinSetup(true);
                } else {
                  setPinMode('disable');
                  setPinInput('');
                  setPinError('');
                  setShowPinSetup(true);
                }
              }}
              trackColor={{ false: '#6366f1', true: '#6366f1' }}
              thumbColor={pinEnabled ? '#fff' : '#ccc'}
            />
          </View>
        </Card.Content>
      </Card>

      {/* 价格提醒 */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>价格提醒</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>当投资品种价格达到目标时通知</Text>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent }]} onPress={openNewAlert}>
            <Text style={[styles.exportBtnText, { color: colors.accentText }]}>🔔 添加价格提醒</Text>
          </TouchableOpacity>
          {alertRules.length > 0 && (
            <View style={styles.alertRuleList}>
              {alertRules.map(rule => (
                <View key={rule.id} style={[styles.alertRuleItem, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <View style={styles.alertRuleInfo}>
                    <Text style={[styles.alertRuleName, { color: colors.text }]}>{rule.investmentName}</Text>
                    <Text style={[styles.alertRuleDetail, { color: colors.textSecondary }]}>
                      {rule.direction === 'above' ? '📈 突破' : '📉 跌破'} ¥{rule.targetPrice.toFixed(rule.subtype === 'fund' ? 4 : 2)}
                      {!rule.enabled && ' · 已禁用'}
                    </Text>
                  </View>
                  <View style={styles.alertRuleActions}>
                    <Switch
                      value={rule.enabled}
                      onValueChange={v => handleToggleAlert(rule.id, v)}
                      trackColor={{ false: colors.textMuted, true: colors.accent }}
                      thumbColor="#fff"
                    />
                    <TouchableOpacity onPress={() => openEditAlert(rule)} style={styles.alertRuleBtn}>
                      <Text style={[styles.alertRuleBtnText, { color: colors.accent }]}>编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteAlert(rule.id)} style={styles.alertRuleBtn}>
                      <Text style={[styles.alertRuleBtnText, { color: colors.loss }]}>删除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 关于 */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>关于</Text>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Assets Tracker</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>版本 1.0.0</Text>
          <Text style={[styles.aboutDesc, { color: colors.textMuted }]}>资产追踪器 - 帮助您管理流动资金、固定资产和理财产品</Text>
        </Card.Content>
      </Card>

      {/* Alert Create/Edit Modal */}
      <Modal visible={showAlertModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {alertEditRule ? '编辑价格提醒' : '添加价格提醒'}
            </Text>

            {/* 投资品种选择 */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>投资品种</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              onPress={() => setShowInvPicker(!showInvPicker)}
            >
              <Text style={[styles.pickerBtnText, { color: alertInvSelect ? colors.text : colors.textMuted }]}>
                {alertInvSelect ? `${alertInvSelect.name} (${subtypeLabel[alertInvSelect.subtype] ?? alertInvSelect.subtype})` : '请选择投资品种'}
              </Text>
            </TouchableOpacity>
            {showInvPicker && (
              <View style={[styles.invPickerList, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <FlatList
                  data={investments}
                  keyExtractor={item => item.id}
                  style={{ maxHeight: 200 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.invPickerItem}
                      onPress={() => { setAlertInvSelect(item); setShowInvPicker(false); }}
                    >
                      <Text style={[styles.invPickerItemText, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.invPickerItemSub, { color: colors.textMuted }]}>{subtypeLabel[item.subtype] ?? item.subtype}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={[styles.invPickerEmpty, { color: colors.textMuted }]}>暂无语料</Text>}
                />
              </View>
            )}

            {/* 方向选择 */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>触发方向</Text>
            <View style={styles.directionRow}>
              {(['above', 'below'] as const).map(dir => (
                <TouchableOpacity
                  key={dir}
                  style={[styles.directionBtn, { backgroundColor: colors.cardSecondary }, alertDirection === dir && { backgroundColor: colors.accent }]}
                  onPress={() => setAlertDirection(dir)}
                >
                  <Text style={[styles.directionBtnText, { color: colors.textSecondary }, alertDirection === dir && { color: colors.accentText, fontWeight: '600' }]}>
                    {dir === 'above' ? '📈 价格突破' : '📉 价格跌破'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 目标价格 */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>目标价格 (¥)</Text>
            <TextInput
              style={[styles.alertPriceInput, { color: colors.text, backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              value={alertTargetPrice}
              onChangeText={setAlertTargetPrice}
              keyboardType="decimal-pad"
              placeholder="例如 885.00"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalCancel, { backgroundColor: colors.cardSecondary }]} onPress={() => setShowAlertModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent, flex: 1, marginLeft: 12 }]} onPress={handleSaveAlert}>
                <Text style={[styles.exportBtnText, { color: colors.accentText }]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Setup / Disable Modal */}
      <Modal visible={showPinSetup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {pinMode === 'setup' ? '设置 PIN' : '验证 PIN'}
            </Text>
            {pinMode === 'setup' && pinInput.length === 4 && (
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>请再次输入以确认</Text>
            )}
            {pinError ? <Text style={[styles.pinError, { color: colors.loss }]}>{pinError}</Text> : null}
            <TextInput
              style={[styles.pinInput, { color: colors.text, backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              value={pinMode === 'disable' ? pinInput : (pinInput.length === 4 ? pinConfirm : pinInput)}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 4);
                setPinError('');
                if (pinMode === 'disable') {
                  setPinInput(digits);
                  if (digits.length === 4) {
                    if (verifyPin(digits)) {
                      clearPin();
                      setShowPinSetup(false);
                    } else {
                      setPinError('PIN 错误');
                      setPinInput('');
                    }
                  }
                } else {
                  if (pinInput.length === 4) {
                    setPinConfirm(digits);
                  } else {
                    setPinInput(digits);
                  }
                }
              }}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              secureTextEntry
              placeholder="请输入 4 位 PIN"
              placeholderTextColor={colors.textMuted}
            />
            {pinMode === 'setup' && pinInput.length === 4 && (
              <TextInput
                style={[styles.pinInput, { color: colors.text, backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                value={pinConfirm}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0, 4);
                  setPinConfirm(digits);
                  if (digits.length === 4) {
                    if (digits === pinInput) {
                      setupPin(digits);
                      setShowPinSetup(false);
                    } else {
                      setPinError('两次输入不一致');
                      setPinInput('');
                      setPinConfirm('');
                    }
                  }
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                secureTextEntry
                placeholder="请再次输入 PIN"
                placeholderTextColor={colors.textMuted}
              />
            )}
            <TouchableOpacity
              style={[styles.modalCancel, { backgroundColor: colors.cardSecondary }]}
              onPress={() => setShowPinSetup(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  pinInput: { width: '100%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, textAlign: 'center', marginBottom: 12, letterSpacing: 4 },
  pinError: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
  modalCancel: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  modalCancelText: { fontSize: 14, fontWeight: '500' },
  // Alert management styles
  alertRuleList: { marginTop: 8 },
  alertRuleItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  alertRuleInfo: { flex: 1 },
  alertRuleName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  alertRuleDetail: { fontSize: 12 },
  alertRuleActions: { flexDirection: 'row', alignItems: 'center' },
  alertRuleBtn: { marginLeft: 10, padding: 4 },
  alertRuleBtnText: { fontSize: 13, fontWeight: '500' },
  fieldLabel: { fontSize: 13, fontWeight: '500', alignSelf: 'flex-start', marginBottom: 6, marginTop: 12 },
  pickerBtn: { width: '100%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  pickerBtnText: { fontSize: 15 },
  invPickerList: { width: '100%', borderRadius: 10, borderWidth: 1, marginTop: 4, padding: 4 },
  invPickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8 },
  invPickerItemText: { fontSize: 14 },
  invPickerItemSub: { fontSize: 12 },
  invPickerEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  directionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  directionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  directionBtnText: { fontSize: 14 },
  alertPriceInput: { width: '100%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 0 },
  modalBtnRow: { flexDirection: 'row', width: '100%', marginTop: 16 },
});