// 应用更新服务 — 从 GitHub Releases 检查并下载 APK

import * as Application from 'expo-application';
import { getInfoAsync, deleteAsync, downloadAsync, getContentUriAsync } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GITHUB_REPO_KEY = '@assets_tracker/github_repo';

export interface AppUpdate {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  fileSize: number;
  publishedAt: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
}

export async function getGitHubRepo(): Promise<GitHubRepo | null> {
  try {
    const raw = await AsyncStorage.getItem(GITHUB_REPO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function saveGitHubRepo(owner: string, repo: string): Promise<void> {
  await AsyncStorage.setItem(GITHUB_REPO_KEY, JSON.stringify({ owner, repo }));
}

export function getCurrentVersion(): string {
  return Application.nativeApplicationVersion || '1.0.0';
}

export async function checkForUpdate(): Promise<AppUpdate | null> {
  const repo = await getGitHubRepo();
  if (!repo) return null;

  try {
    const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`;
    const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
    if (!response.ok) return null;

    const release = await response.json();
    const latestVersion = release.tag_name?.replace(/^v/, '') || '';
    if (!isNewerVersion(latestVersion, getCurrentVersion())) return null;

    const apkAsset = release.assets?.find((a: any) => a.name?.endsWith('.apk') && a.browser_download_url);
    if (!apkAsset) return null;

    return {
      version: latestVersion,
      downloadUrl: apkAsset.browser_download_url,
      releaseNotes: release.body || '暂无更新说明',
      fileSize: apkAsset.size || 0,
      publishedAt: release.published_at || '',
    };
  } catch (e) {
    console.error('[update] check failed:', e);
    return null;
  }
}

export async function downloadAndInstall(update: AppUpdate): Promise<void> {
  // 使用临时目录存放 APK
  const dir = `${Date.now()}/`;
  const downloadPath = `file:///data/cache/update.apk`;

  const info = await getInfoAsync(downloadPath);
  if (info.exists) await deleteAsync(downloadPath);

  const result = await downloadAsync(update.downloadUrl, downloadPath);
  if (!result.uri) throw new Error('下载失败');

  const contentUri = await getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
}

function isNewerVersion(latest: string, current: string): boolean {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}
