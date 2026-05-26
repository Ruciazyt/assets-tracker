// 汇率服务 - 支持日元等主要货币

import { query } from './common.js';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// 获取汇率
export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
  const pair = `${from}/${to}`;
  const result = await query(`${pair} 汇率 换算 最新`);
  
  if (!result.success || !result.data) return null;
  
  const data = result.data as any;
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0];
      const f3 = rawTable.f3?.[0];
      const f4 = rawTable.f4?.[0];
      
      if (f2) {
        return {
          from,
          to,
          rate: parseFloat(f2),
          change: parseFloat(f4 || '0'),
          changePercent: parseFloat(f3 || '0'),
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('Exchange rate parse error:', e);
  }
  
  return null;
}

// 获取日元汇率 (JPY/CNY)
export async function getJPYRate(): Promise<ExchangeRate | null> {
  // 东方财富使用 美元/人民币，然后换算日元
  const result = await query(`美元兑人民币 USD/CNY 汇率 最新`);
  
  if (!result.success || !result.data) return null;
  
  const data = result.data as any;
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0]; // USD/CNY rate
      
      if (f2) {
        const usdCny = parseFloat(f2);
        // JPY/CNY = USD/CNY / USD/JPY
        // 假设 USD/JPY ≈ 150
        const usdJpy = 150;
        const jpyCny = usdCny / usdJpy;
        
        return {
          from: 'JPY',
          to: 'CNY',
          rate: parseFloat(jpyCny.toFixed(4)),
          change: 0,
          changePercent: 0,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('JPY rate parse error:', e);
  }
  
  return null;
}
