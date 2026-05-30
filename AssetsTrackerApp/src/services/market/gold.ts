// 黄金价格服务 — 使用东方财富 API
// 黄金无法直接查到，用 AI 作为主要来源，API 作为补充

import { query, getDataTables, extractField } from './common';

export interface GoldPrice {
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export async function getGoldPrice(): Promise<GoldPrice | null> {
  // 尝试多种查询格式
  const queries = [
    'AU9999 最新价',
    '黄金9999 价格',
    '沪金 价格',
  ];

  for (const q of queries) {
    const result = await query<any>(q);
    if (!result.success || !result.data) continue;

    const tables = getDataTables(result.data);
    for (const table of tables) {
      const price = extractField(table, '最新价')
        || extractField(table, '收盘价')
        || extractField(table, '价格');
      if (price && parseFloat(price) > 0) {
        const change = extractField(table, '涨跌额') || '0';
        const changePercent = extractField(table, '涨跌幅') || '0';
        return {
          price: parseFloat(price),
          change: parseFloat(change),
          changePercent: parseFloat(changePercent),
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  return null;
}
