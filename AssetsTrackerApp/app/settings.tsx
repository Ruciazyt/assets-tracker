// 设置页面

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput, Modal, FlatList } from 'react-native';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { useTranslation } from '../src/i18n/LanguageContext';
import { getAlertRules, saveAlertRule, deleteAlertRule, toggleAlertRule, AlertRule } from '../src/services/alertService';
import { Investment } from '../src/types/investment';

const currencies = ['CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP'];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();
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
    Alert.alert(t('common.success'), `Default currency set to ${currency}`);
  };

  const handleRefreshChange = async (value: number) => {
    setRefreshInterval(value);
    const existing = await AsyncStorage.getItem('@assets_tracker/settings');
    const updated = { ...JSON.parse(existing || '{}'), refreshInterval: value };
    await AsyncStorage.setItem('@assets_tracker/settings', JSON.stringify(updated));
    const label = refreshOptions.find(o => o.value === value)?.label ?? String(value);
    Alert.alert(t('common.success'), `Auto refresh set to ${label}`);
  };

  const refreshOptions = [
    { label: t('common.cancel'), value: 0 },
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
    { label: '60s', value: 60 },
    { label: '5min', value: 300 },
  ];

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
      Alert.alert(t('common.success'), t('settings.exportSuccess').replace('{n}', String(assets ? JSON.parse(assets).length : 0)));
    } catch (e) {
      Alert.alert(t('common.error'), t('settings.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    Alert.alert(t('import.title'), t('settings.importUnsupported'));
  };

  const handleClearData = () => {
    Alert.alert(t('common.confirm'), t('settings.clearData') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['@assets_tracker/assets', '@assets_tracker/investments']);
        Alert.alert(t('common.success'), t('settings.cleared'));
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
      Alert.alert(t('common.error'), t('settings.selectInvestment'));
      return;
    }
    const price = parseFloat(alertTargetPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert(t('common.error'), t('settings.enterValidPrice'));
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
    Alert.alert(t('common.confirm'), t('common.delete') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.themeLabel, { color: colors.text }]}>{t('settings.darkMode')}</Text>
              <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>{isDark ? t('settings.darkMode') : t('settings.lightMode')}</Text>
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

      {/* Language */}
      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, { backgroundColor: colors.cardSecondary }, lang === 'CN' && { backgroundColor: colors.accent }]}
              onPress={() => setLang('CN')}
            >
              <Text style={[styles.langBtnText, { color: colors.textSecondary }, lang === 'CN' && { color: colors.accentText, fontWeight: '600' }]}>🇨🇳 {t('settings.langCN')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, { backgroundColor: colors.cardSecondary }, lang === 'EN' && { backgroundColor: colors.accent }]}
              onPress={() => setLang('EN')}
            >
              <Text style={[styles.langBtnText, { color: colors.textSecondary }, lang === 'EN' && { color: colors.accentText, fontWeight: '600' }]}>🇺🇸 {t('settings.langEN')}</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.refreshInterval')}</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.currency')}</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.backup')}</Text>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent }]} onPress={handleExportData} disabled={isExporting}>
            <Text style={[styles.exportBtnText, { color: colors.accentText }]}>{isExporting ? '...' : '📤 ' + t('settings.export')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.importBtn, { backgroundColor: colors.cardSecondary }]} onPress={handleImportData}>
            <Text style={[styles.importBtnText, { color: colors.accent }]}>📥 {t('settings.import')}</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.clearData')}</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>🗑️ {t('common.delete')} {t('settings.clearData')}</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.card }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.pin')}</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.themeLabel, { color: colors.text }]}>{t('settings.pin')}</Text>
              <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                {pinEnabled ? t('settings.pinEnabled') : t('settings.pinDisabled')}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.alerts')}</Text>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent }]} onPress={openNewAlert}>
            <Text style={[styles.exportBtnText, { color: colors.accentText }]}>🔔 {t('settings.addAlert')}</Text>
          </TouchableOpacity>
          {alertRules.length > 0 && (
            <View style={styles.alertRuleList}>
              {alertRules.map(rule => (
                <View key={rule.id} style={[styles.alertRuleItem, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <View style={styles.alertRuleInfo}>
                    <Text style={[styles.alertRuleName, { color: colors.text }]}>{rule.investmentName}</Text>
                    <Text style={[styles.alertRuleDetail, { color: colors.textSecondary }]}>
                      {rule.direction === 'above' ? '📈 ' : '📉 '}{t('settings.alerts')} ¥{rule.targetPrice.toFixed(rule.subtype === 'fund' ? 4 : 2)}
                      {!rule.enabled && ' · ' + t('settings.pinDisabled')}
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
                      <Text style={[styles.alertRuleBtnText, { color: colors.accent }]}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteAlert(rule.id)} style={styles.alertRuleBtn}>
                      <Text style={[styles.alertRuleBtnText, { color: colors.loss }]}>{t('common.delete')}</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.about')}</Text>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Assets Tracker</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.aboutDesc, { color: colors.textMuted }]}>Assets Tracker - Manage cash, assets and investments</Text>
        </Card.Content>
      </Card>

      {/* Alert Create/Edit Modal */}
      <Modal visible={showAlertModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {alertEditRule ? t('common.edit') : t('settings.addAlert')}
            </Text>

            {/* 投资品种选择 */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Investment</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              onPress={() => setShowInvPicker(!showInvPicker)}
            >
              <Text style={[styles.pickerBtnText, { color: alertInvSelect ? colors.text : colors.textMuted }]}>
                {alertInvSelect ? `${alertInvSelect.name} (${subtypeLabel[alertInvSelect.subtype] ?? alertInvSelect.subtype})` : 'Select investment'}
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
                  ListEmptyComponent={<Text style={[styles.invPickerEmpty, { color: colors.textMuted }]}>No investments</Text>}
                />
              </View>
            )}

            {/* 方向选择 */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Direction</Text>
            <View style={styles.directionRow}>
              {(['above', 'below'] as const).map(dir => (
                <TouchableOpacity
                  key={dir}
                  style={[styles.directionBtn, { backgroundColor: colors.cardSecondary }, alertDirection === dir && { backgroundColor: colors.accent }]}
                  onPress={() => setAlertDirection(dir)}
                >
                  <Text style={[styles.directionBtnText, { color: colors.textSecondary }, alertDirection === dir && { color: colors.accentText, fontWeight: '600' }]}>
                    {dir === 'above' ? '📈 Price Above' : '📉 Price Below'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 目标价格 */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target Price (¥)</Text>
            <TextInput
              style={[styles.alertPriceInput, { color: colors.text, backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              value={alertTargetPrice}
              onChangeText={setAlertTargetPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 885.00"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalCancel, { backgroundColor: colors.cardSecondary }]} onPress={() => setShowAlertModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent, flex: 1, marginLeft: 12 }]} onPress={handleSaveAlert}>
                <Text style={[styles.exportBtnText, { color: colors.accentText }]}>{t('common.save')}</Text>
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
              {pinMode === 'setup' ? 'Set PIN' : 'Verify PIN'}
            </Text>
            {pinMode === 'setup' && pinInput.length === 4 && (
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Please confirm</Text>
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
                      setPinError('PIN error');
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
              placeholder="Enter 4-digit PIN"
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
                      setPinError('PINs do not match');
                      setPinInput('');
                      setPinConfirm('');
                    }
                  }
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                secureTextEntry
                placeholder="Confirm PIN"
                placeholderTextColor={colors.textMuted}
              />
            )}
            <TouchableOpacity
              style={[styles.modalCancel, { backgroundColor: colors.cardSecondary }]}
              onPress={() => setShowPinSetup(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
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
  langRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  langBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  langBtnText: { fontSize: 15, fontWeight: '500' },
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