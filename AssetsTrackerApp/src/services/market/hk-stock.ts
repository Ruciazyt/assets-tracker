// 港股股票行情服务

import { query } from './common';

export interface HKStockQuote {
  code: string;
  name: string;
  priceHKD: number;
  priceCNY: number;
  change: number;
  changePercent: number;
  volume: number;
  amountHKD: number;
  exchangeRate: number;
  timestamp: string;
}

// 获取港股股票行情
export async function getHKStockQuote(stockCode: string): Promise<HKStockQuote | null> {
  const result = await query(`${stockCode} 港股 最新价 涨跌幅 成交量`);
  
  if (!result.success || !result.data) return null;
  
  const data = result.data as any;
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0];
      const f3 = rawTable.f3?.[0];
      const f4 = rawTable.f4?.[0];
      const f5 = rawTable.f5?.[0];
      const f6 = rawTable.f6?.[0];
      
      if (f2) {
        const priceHKD = parseFloat(f2);
        const changePercent = parseFloat(f3 || '0');
        // 假设汇率 1 HKD = 0.92 CNY (从系统获取)
        const exchangeRate = 0.92;
        return {
          code: stockCode,
          name: table.entityName?.split('(')[0]?.trim() || stockCode,
          priceHKD,
          priceCNY: priceHKD * exchangeRate,
          change: parseFloat(f4 || '0'),
          changePercent,
          volume: parseInt(f5 || '0'),
          amountHKD: parseFloat(f6 || '0'),
          exchangeRate,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('HK Stock parse error:', e);
  }
  
  return null;
}
