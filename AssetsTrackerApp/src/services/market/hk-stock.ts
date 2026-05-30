// 港股行情服务

import { query, getDataTables, extractField } from './common';

export interface HKStockQuote {
  code: string;
  name: string;
  priceHKD: number;
  priceCNY: number;
  change: number;
  changePercent: number;
  exchangeRate: number;
  timestamp: string;
}

export async function getHKStockQuote(stockCode: string): Promise<HKStockQuote | null> {
  const result = await query<any>(`${stockCode} 港股 最新价`);
  if (!result.success || !result.data) return null;

  const tables = getDataTables(result.data);
  for (const table of tables) {
    const price = extractField(table, '最新价') || extractField(table, '收盘价');
    if (price && parseFloat(price) > 0) {
      const priceHKD = parseFloat(price);
      const exchangeRate = 0.92;
      const entityName = table.entityName || stockCode;
      const name = entityName.split('(')[0]?.trim() || stockCode;
      const changePercent = extractField(table, '涨跌幅') || '0';

      return {
        code: stockCode, name, priceHKD,
        priceCNY: priceHKD * exchangeRate,
        change: 0, changePercent: parseFloat(changePercent),
        exchangeRate, timestamp: new Date().toISOString(),
      };
    }
  }
  return null;
}
