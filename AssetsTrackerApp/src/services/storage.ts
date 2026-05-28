// 本地存储服务 - 使用JSON文件持久化
// 注意：此文件为遗留代码，实际存储使用 AsyncStorage，App 代码不引用此文件
// @ts-nocheck
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';



const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

interface StorageSchema {
  assets: Asset[];
  investments: Investment[];
  settings: {
    defaultCurrency: string;
    lastUpdate: string;
  };
}

const DEFAULT_DATA: StorageSchema = {
  assets: [],
  investments: [],
  settings: {
    defaultCurrency: 'CNY',
    lastUpdate: new Date().toISOString(),
  },
};

function getFilePath(): string {
  return join(DATA_DIR, 'assets.json');
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadData(): StorageSchema {
  ensureDataDir();
  const filePath = getFilePath();
  
  if (!existsSync(filePath)) {
    return DEFAULT_DATA;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: StorageSchema): void {
  ensureDataDir();
  const filePath = getFilePath();
  data.settings.lastUpdate = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// === Asset 操作 ===

export function addAsset(asset: Asset): Asset {
  const data = loadData();
  asset.id = crypto.randomUUID();
  asset.createdAt = new Date().toISOString();
  asset.updatedAt = asset.createdAt;
  data.assets.push(asset);
  saveData(data);
  return asset;
}

export function updateAsset(id: string, updates: Partial<Asset>): Asset | null {
  const data = loadData();
  const index = data.assets.findIndex(a => a.id === id);
  
  if (index === -1) return null;
  
  const original = data.assets[index];
  const updated: Asset = {
    ...original,
    ...(updates as Partial<BaseAsset>),
    updatedAt: new Date().toISOString(),
  } as Asset;
  data.assets[index] = updated;
  saveData(data);
  return updated;
}

export function deleteAsset(id: string): boolean {
  const data = loadData();
  const index = data.assets.findIndex(a => a.id === id);
  
  if (index === -1) return false;
  
  data.assets.splice(index, 1);
  saveData(data);
  return true;
}

export function getAllAssets(): Asset[] {
  return loadData().assets;
}

// === Investment 操作 ===

export function addInvestment(inv: Investment): Investment {
  const data = loadData();
  inv.id = crypto.randomUUID();
  inv.createdAt = new Date().toISOString();
  inv.updatedAt = inv.createdAt;
  data.investments.push(inv);
  saveData(data);
  return inv;
}

export function updateInvestment(id: string, updates: Partial<Investment>): Investment | null {
  const data = loadData();
  const index = data.investments.findIndex(i => i.id === id);
  
  if (index === -1) return null;
  
  const original = data.investments[index];
  const updated: Investment = {
    ...original,
    ...updates,
    updatedAt: new Date().toISOString(),
  } as Investment;
  data.investments[index] = updated;
  saveData(data);
  return updated;
}

export function deleteInvestment(id: string): boolean {
  const data = loadData();
  const index = data.investments.findIndex(i => i.id === id);
  
  if (index === -1) return false;
  
  data.investments.splice(index, 1);
  saveData(data);
  return true;
}

export function getAllInvestments(): Investment[] {
  return loadData().investments;
}

// === 汇总统计 ===

export interface PortfolioSummary {
  totalAssets: number;
  totalInvestments: number;
  totalValue: number;
  dailyPnl: number;
  totalPnl: number;
}

export function getPortfolioSummary(): PortfolioSummary {
  const data = loadData();
  
  const totalAssets = data.assets.reduce((sum, a) => sum + a.amount, 0);
  const invs = data.investments;
  
  const totalInvestments = invs.reduce((sum, i) => sum + (i.amount || 0), 0);
  const dailyPnl = invs.reduce((sum, i) => sum + (i.dailyPnl || 0), 0);
  const totalPnl = invs.reduce((sum, i) => sum + (i.totalPnl || 0), 0);
  
  return {
    totalAssets,
    totalInvestments,
    totalValue: totalAssets + totalInvestments,
    dailyPnl,
    totalPnl,
  };
}
