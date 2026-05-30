// 设置页面 — AI 配置 + 刷新 + 数据管理 + 更新检查 + 关于

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../src/theme/ThemeProvider';
import AppleCard from '../src/components/AppleCard';
import AppleButton from '../src/components/AppleButton';
import AppleTextInput from '../src/components/AppleTextInput';
import SegmentedControl from '../src/components/SegmentedControl';
import SectionHeader from '../src/components/SectionHeader';
import { getAIConfig, saveAIConfig, testAIConnection, AIPricingConfig } from '../src/services/market/ai-pricing';
import { checkForUpdate, downloadAndInstall, getCurrentVersion, AppUpdate, getGitHubRepo, saveGitHubRepo } from '../src/services/updateService';

export default function SettingsScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();

  // AI 配置
  const [aiProvider, setAiProvider] = useState<'claude' | 'openai'>('claude');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // 通用设置
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // 更新
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepoName] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdate | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const aiCfg = await getAIConfig();
      if (aiCfg) {
        setAiProvider(aiCfg.provider);
        setApiKey(aiCfg.apiKey);
        setModel(aiCfg.model || '');
        setBaseUrl(aiCfg.baseUrl || '');
      }
      const settingsStr = await AsyncStorage.getItem('@assets_tracker/settings');
      if (settingsStr) { setRefreshInterval(Number(JSON.parse(settingsStr).refreshInterval ?? 0)); }
      const repo = await getGitHubRepo();
      if (repo) { setGithubOwner(repo.owner); setGithubRepoName(repo.repo); }
    } catch (e) { console.error('加载设置失败', e); }
  };

  // ── AI ──
  const buildAIConfig = (): AIPricingConfig => ({
    provider: aiProvider,
    apiKey: apiKey.trim(),
    model: model.trim() || undefined,
    baseUrl: baseUrl.trim() || undefined,
  });

  const handleSaveAIConfig = async () => {
    if (!apiKey.trim()) { Alert.alert('错误', '请输入接口密钥'); return; }
    await saveAIConfig(buildAIConfig());
    Alert.alert('成功', '接口配置已保存');
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) { Alert.alert('错误', '请先输入接口密钥'); return; }
    setTesting(true); setTestResult(null);
    try {
      const result = await testAIConnection(buildAIConfig());
      setTestResult(result);
      Alert.alert(result.success ? '成功' : '失败', result.success ? '连接测试通过' : (result.error || '连接失败'));
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    } finally { setTesting(false); }
  };

  // ── 刷新 ──
  const handleRefreshChange = async (value: number) => {
    setRefreshInterval(value);
    const existing = await AsyncStorage.getItem('@assets_tracker/settings');
    await AsyncStorage.setItem('@assets_tracker/settings', JSON.stringify({ ...JSON.parse(existing || '{}'), refreshInterval: value }));
  };

  // ── 数据 ──
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [assets, investments, settings] = await Promise.all([
        AsyncStorage.getItem('@assets_tracker/assets'),
        AsyncStorage.getItem('@assets_tracker/investments'),
        AsyncStorage.getItem('@assets_tracker/settings'),
      ]);
      await Clipboard.setStringAsync(JSON.stringify({
        version: '1.0.0', exportTime: new Date().toISOString(),
        assets: assets ? JSON.parse(assets) : [],
        investments: investments ? JSON.parse(investments) : [],
        settings: settings ? JSON.parse(settings) : {},
      }, null, 2));
      Alert.alert('成功', '数据已复制到剪贴板');
    } catch { Alert.alert('错误', '导出失败'); }
    finally { setIsExporting(false); }
  };

  const handleClearData = () => {
    Alert.alert('确认', '确定清除所有数据？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['@assets_tracker/assets', '@assets_tracker/investments']);
        Alert.alert('成功', '数据已清除');
      }},
    ]);
  };

  // ── 更新 ──
  const handleSaveRepo = async () => {
    if (!githubOwner.trim() || !githubRepo.trim()) { Alert.alert('错误', '请输入完整仓库信息'); return; }
    await saveGitHubRepo(githubOwner.trim(), githubRepo.trim());
    Alert.alert('成功', '仓库配置已保存');
  };

  const handleCheckUpdate = async () => {
    if (!githubOwner.trim() || !githubRepo.trim()) { Alert.alert('提示', '请先配置代码仓库'); return; }
    await saveGitHubRepo(githubOwner.trim(), githubRepo.trim());
    setCheckingUpdate(true); setUpdateInfo(null);
    try {
      const update = await checkForUpdate();
      if (update) {
        setUpdateInfo(update);
        Alert.alert('发现新版本', `v${update.version}\n\n${update.releaseNotes.slice(0, 200)}`,
          [
            { text: '稍后', style: 'cancel' },
            { text: '立即更新', onPress: () => handleDownloadUpdate(update) },
          ]);
      } else {
        Alert.alert('已是最新', `当前版本 v${getCurrentVersion()}`);
      }
    } catch (e: any) {
      Alert.alert('错误', e.message || '检查更新失败');
    } finally { setCheckingUpdate(false); }
  };

  const handleDownloadUpdate = async (update: AppUpdate) => {
    setDownloading(true);
    try { await downloadAndInstall(update); }
    catch (e: any) { Alert.alert('错误', e.message || '下载失败'); }
    finally { setDownloading(false); }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.parchment }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      {/* ── 接口服务 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="接口服务" />
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
          配置 AI 接口获取市场价格与截图识别
        </Text>
        <Text style={[typography.captionStrong, { color: colors.textMuted, marginBottom: spacing.xs }]}>服务商</Text>
        <SegmentedControl
          segments={[{ label: 'Claude', value: 'claude' }, { label: 'OpenAI', value: 'openai' }]}
          selected={aiProvider}
          onValueChange={v => { setAiProvider(v as 'claude' | 'openai'); setTestResult(null); }}
        />
        <View style={{ marginTop: spacing.sm }}>
          <AppleTextInput label="接口密钥" value={apiKey} onChangeText={setApiKey} placeholder={aiProvider === 'claude' ? 'sk-ant-...' : 'sk-...'} />
        </View>
        <AppleTextInput
          label="接口地址（留空用默认）"
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder={aiProvider === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com'}
        />
        <AppleTextInput
          label="模型（留空用默认）"
          value={model}
          onChangeText={setModel}
          placeholder={aiProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o'}
        />
        {testResult && (
          <View style={{ backgroundColor: testResult.success ? colors.gainBackground : colors.lossBackground, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm }}>
            <Text style={[typography.caption, { color: testResult.success ? colors.gain : colors.loss }]}>{testResult.success ? '连接成功' : testResult.error}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <View style={{ flex: 1 }}><AppleButton title={testing ? '测试中...' : '测试连接'} onPress={handleTestConnection} variant="secondary" fullWidth loading={testing} /></View>
          <View style={{ flex: 1 }}><AppleButton title="保存配置" onPress={handleSaveAIConfig} fullWidth /></View>
        </View>
      </AppleCard>

      {/* ── 自动刷新 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="自动刷新" />
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          行情数据刷新频率
        </Text>
        <SegmentedControl
          segments={[
            { label: '关闭', value: '0' },
            { label: '15秒', value: '15' },
            { label: '30秒', value: '30' },
            { label: '60秒', value: '60' },
            { label: '5分钟', value: '300' },
          ]}
          selected={String(refreshInterval)}
          onValueChange={v => handleRefreshChange(Number(v))}
          scrollable
        />
      </AppleCard>

      {/* ── 应用更新 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="应用更新" />
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          当前版本 v{getCurrentVersion()}
        </Text>
        <AppleTextInput label="代码仓库所有者" value={githubOwner} onChangeText={setGithubOwner} placeholder="例如：ruciaz" />
        <AppleTextInput label="代码仓库名称" value={githubRepo} onChangeText={setGithubRepoName} placeholder="例如：assets-tracker" />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}><AppleButton title="保存" onPress={handleSaveRepo} variant="secondary" fullWidth /></View>
          <View style={{ flex: 1 }}>
            <AppleButton
              title={checkingUpdate ? '检查中...' : downloading ? '下载中...' : '检查更新'}
              onPress={handleCheckUpdate}
              fullWidth
              loading={checkingUpdate || downloading}
            />
          </View>
        </View>
        {updateInfo && (
          <View style={{ backgroundColor: colors.parchment, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm }}>
            <Text style={[typography.captionStrong, { color: colors.ink }]}>新版本 v{updateInfo.version}</Text>
            <Text style={[typography.finePrint, { color: colors.textMuted, marginTop: spacing.xxs }]}>{updateInfo.releaseNotes.slice(0, 300)}</Text>
          </View>
        )}
      </AppleCard>

      {/* ── 数据管理 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="数据管理" />
        <View style={{ gap: spacing.sm }}>
          <AppleButton title={isExporting ? '导出中...' : '导出数据到剪贴板'} onPress={handleExportData} variant="secondary" fullWidth loading={isExporting} />
          <AppleButton title="清除所有数据" onPress={handleClearData} variant="danger" fullWidth />
        </View>
      </AppleCard>

      {/* ── 关于 ── */}
      <AppleCard padding="lg" style={{ marginBottom: spacing.md }}>
        <SectionHeader title="关于" />
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <Text style={[typography.tagline, { color: colors.ink }]}>资产追踪器</Text>
          <Text style={[typography.finePrint, { color: colors.textMuted, marginTop: spacing.xxs }]}>版本 {getCurrentVersion()}</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
            管理流动资金、固定资产和投资理财
          </Text>
        </View>
      </AppleCard>
    </ScrollView>
  );
}
