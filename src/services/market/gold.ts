// 黄金价格服务

import { query } from './common.js';

export interface GoldPrice {
  price: number;        // 元/克
  change: number;       // 涨跌额
  changePercent: number; // 涨跌幅%
  timestamp: string;
}

// 东方财富现货黄金价格查询
export async function getGoldPrice(): Promise<GoldPrice | null> {
  // 现货黄金 AU99.99
  const result = await query(`AU99.99 黄金现货 最新价格 涨跌幅`);
  
  if (!result.success || !result.data) return null;
  
  const data = result.data as any;
  // 解析东方财富返回的行情数据
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const nameMap = table.nameMap || {};
      const rawTable = table.rawTable || {};
      
      // 找到最新价格和涨跌幅
      const f2 = rawTable.f2?.[0]; // 最新价
      const f3 = rawTable.f3?.[0]; // 涨跌幅
      const f4 = rawTable.f4?.[0]; // 涨跌额
      
      if (f2) {
        return {
          price: parseFloat(f2),
          change: parseFloat(f4 || '0'),
          changePercent: parseFloat(f3 || '0'),
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('Gold price parse error:', e);
  }
  
  return null;
}

export const GOLD_SYMBOL = 'AU99.99';
