// A 股行情服务

import { query, getDataTables, extractField } from './common';

export interface StockQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export async function getCNStockQuote(stockCode: string): Promise<StockQuote | null> {
  const result = await query<any>(`${stockCode} 最新价 涨跌幅`);
  if (!result.success || !result.data) return null;

  const tables = getDataTables(result.data);
  for (const table of tables) {
    const price = extractField(table, '最新价') || extractField(table, '收盘价');
    if (price && parseFloat(price) > 0) {
      const changePercent = extractField(table, '涨跌幅') || '0';
      const changeVal = extractField(table, '涨跌额') || '0';
      const entityName = table.entityName || stockCode;
      const name = entityName.split('(')[0]?.trim() || stockCode;

      return {
        code: stockCode,
        name,
        price: parseFloat(price),
        change: parseFloat(changeVal),
        changePercent: parseFloat(changePercent) * (Math.abs(parseFloat(changePercent)) > 10 ? 1 : 100),
        timestamp: new Date().toISOString(),
      };
    }
  }
  return null;
}
