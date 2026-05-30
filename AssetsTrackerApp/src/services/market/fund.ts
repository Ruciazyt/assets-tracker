// 基金服务 — 净值查询 + 搜索

import { query, getDataTables, extractField } from './common';

export interface FundInfo {
  code: string;
  name: string;
  netValue: number;
  changePercent: number;
  dailyChange: number;
  updateDate: string;
}

/** 按基金代码查询净值 */
export async function getFundInfo(fundCode: string): Promise<FundInfo | null> {
  const result = await query<any>(`${fundCode} 基金 净值`);
  if (!result.success || !result.data) return null;

  const tables = getDataTables(result.data);
  for (const table of tables) {
    const netValueStr = extractField(table, '单位净值');
    if (netValueStr && parseFloat(netValueStr) > 0) {
      const entityName = table.entityName || fundCode;
      // entityName 格式: "华泰柏瑞沪深300ETF(510300.SH)"
      const name = entityName.split('(')[0]?.trim() || fundCode;

      return {
        code: fundCode,
        name,
        netValue: parseFloat(netValueStr),
        changePercent: 0,
        dailyChange: 0,
        updateDate: new Date().toISOString().split('T')[0],
      };
    }
  }
  return null;
}

// ── 基金搜索 ──

export interface FundSearchResult {
  code: string;
  name: string;
  type: string;
}

/** 按关键词搜索基金 */
export async function searchFunds(keyword: string): Promise<FundSearchResult[]> {
  if (!keyword.trim()) return [];

  const result = await query<any>(`${keyword} 基金`);
  if (!result.success || !result.data) return [];

  const tables = getDataTables(result.data);
  const funds: FundSearchResult[] = [];

  for (const table of tables) {
    const entityName = table.entityName;
    if (!entityName || !entityName.includes('(')) continue;

    // 解析 "基金名称(代码)" 格式
    const match = entityName.match(/^(.+?)\((\d+)/);
    if (match) {
      const name = match[1].trim();
      const code = match[2];
      // 去重
      if (!funds.find(f => f.code === code)) {
        funds.push({ code, name, type: '基金' });
      }
    }
  }

  return funds.slice(0, 20);
}
