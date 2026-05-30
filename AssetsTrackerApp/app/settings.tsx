// 设置页面 — 精简版
// AI 价格服务 + 自动刷新 + 数据管理 + 关于

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import SectionHeader from '../src/components/SectionHeader';
import { getAIConfig, saveAIConfig, testAIConnection, AIPricingConfig } from '../src/services/market/ai-pricing';

const refreshOptions = [
  { label: '关闭', value: 0 },
  { label: '15秒', value: 15 },
  { label: '30秒', value: 30 },
  { label: '60秒', value: 60 },
  { label: '5分钟', value: 300 },
];

export default function SettingsScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();

  // AI 配置
  const [aiProvider, setAiProvider] = useState<'claude' | 'openai'>('claude');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // 通用设置
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      // AI 配置
      const aiCfg = await getAIConfig();
      if (aiCfg) {
        setAiProvider(aiCfg.provider);
        setApiKey(aiCfg.apiKey);
        setModel(aiCfg.model || '');
      }
      // 通用设置
      const settingsStr = await AsyncStorage.getItem('@assets_tracker/settings');
      if (settingsStr) {
        const parsed = JSON.parse(settingsStr);
        setRefreshInterval(Number(parsed.refreshInterval ?? 0));
      }
    } catch (e) {
      console.error('Load settings error:', e);
    }
  };

  // ── AI 配置保存 ──
  const handleSaveAIConfig = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请输入 API Key');
      return;
    }
    const config: AIPricingConfig = {
      provider: aiProvider,
      apiKey: apiKey.trim(),
      model: model.trim() || undefined,
    };
    await saveAIConfig(config);
    Alert.alert('成功', 'AI 配置已保存');
  };

  // ── AI 连接测试 ──
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请先输入 API Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const config: AIPricingConfig = {
        provider: aiProvider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
      };
      const result = await testAIConnection(config);
      setTestResult(result);
      if (result.success) {
        Alert.alert('成功', 'AI 连接测试通过');
      } else {
        Alert.alert('失败', result.error || '连接失败');
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      Alert.alert('错误', e.message);
    } finally {
      setTesting(false);
    }
  };

  // ── 刷新间隔 ──
  const handleRefreshChange = async (value: number) => {
    setRefreshInterval(value);
    const existing = await AsyncStorage.getItem('@assets_tracker/settings');
    const updated = { ...JSON.parse(existing || '{}'), refreshInterval: value };
    await AsyncStorage.setItem('@assets_tracker/settings', JSON.stringify(updated));
  };

  // ── 数据导出 ──
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [assets, investments, settings] = await Promise.all([
        AsyncStorage.getItem('@assets_tracker/assets'),
        AsyncStorage.getItem('@assets_tracker/investments'),
        AsyncStorage.getItem('@assets_tracker/settings'),
      ]);
      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        assets: assets ? JSON.parse(assets) : [],
        investments: investments ? JSON.parse(investments) : [],
        settings: settings ? JSON.parse(settings) : {},
      };
      await Clipboard.setStringAsync(JSON.stringify(exportData, null, 2));
      Alert.alert('成功', `数据已复制到剪贴板`);
    } catch (e) {
      Alert.alert('错误', '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  // ── 清除数据 ──
  const handleClearData = () => {
    Alert.alert('确认', '确定清除所有数据？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['@assets_tracker/assets', '@assets_tracker/investments']);
        Alert.alert('成功', '数据已清除');
      }},
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.parchment }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      {/* ── AI 价格服务 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="AI 价格服务" />
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
          配置 AI 服务获取最新市场价格（黄金、股票、基金等）
        </Text>

        {/* Provider 选择 */}
        <Text style={[typography.captionStrong, { color: colors.textMuted, marginBottom: spacing.xs }]}>AI 服务</Text>
        <SegmentedControl
          segments={[
            { label: 'Claude', value: 'claude' },
            { label: 'OpenAI', value: 'openai' },
          ]}
          selected={aiProvider}
          onValueChange={v => { setAiProvider(v as 'claude' | 'openai'); setTestResult(null); }}
        />

        {/* API Key */}
        <View style={{ marginTop: spacing.sm }}>
          <AppleTextInput
            label="API Key"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={aiProvider === 'claude' ? 'sk-ant-...' : 'sk-...'}
          />
        </View>

        {/* Model（可选） */}
        <AppleTextInput
          label="模型（可选）"
          value={model}
          onChangeText={setModel}
          placeholder={aiProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
        />

        {/* 测试结果提示 */}
        {testResult && (
          <View style={{
            backgroundColor: testResult.success ? colors.gainBackground : colors.lossBackground,
            borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm,
          }}>
            <Text style={[typography.caption, { color: testResult.success ? colors.gain : colors.loss }]}>
              {testResult.success ? '连接成功' : testResult.error}
            </Text>
          </View>
        )}

        {/* 操作按钮 */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppleButton
              title={testing ? '测试中...' : '测试连接'}
              onPress={handleTestConnection}
              variant="secondary"
              fullWidth
              loading={testing}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppleButton title="保存配置" onPress={handleSaveAIConfig} fullWidth />
          </View>
        </View>
      </AppleCard>

      {/* ── 自动刷新 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="自动刷新" />
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          设置行情数据自动刷新频率
        </Text>
        <SegmentedControl
          segments={refreshOptions.map(o => ({ label: o.label, value: String(o.value) }))}
          selected={String(refreshInterval)}
          onValueChange={v => handleRefreshChange(Number(v))}
        />
      </AppleCard>

      {/* ── 数据管理 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="数据管理" />
        <View style={{ gap: spacing.sm }}>
          <AppleButton
            title={isExporting ? '导出中...' : '导出数据到剪贴板'}
            onPress={handleExportData}
            variant="secondary"
            fullWidth
            loading={isExporting}
          />
          <AppleButton
            title="清除所有数据"
            onPress={handleClearData}
            variant="danger"
            fullWidth
          />
        </View>
      </AppleCard>

      {/* ── 关于 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="关于" />
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <Text style={[typography.tagline, { color: colors.ink }]}>Assets Tracker</Text>
          <Text style={[typography.finePrint, { color: colors.textMuted, marginTop: spacing.xxs }]}>Version 1.0.0</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
            资产追踪器 — 管理流动资金、固定资产和投资理财
          </Text>
        </View>
      </AppleCard>
    </ScrollView>
  );
}
