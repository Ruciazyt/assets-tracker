// 基金净值服务

import { query } from './common';

export interface FundInfo {
  code: string;
  name: string;
  netValue: number;     // 最新净值
  dailyChange: number;   // 每日涨跌
  changePercent: number; // 涨跌幅%
  updateDate: string;
}

export async function getFundInfo(fundCode: string): Promise<FundInfo | null> {
  const result = await query(`${fundCode} 基金 最新净值 涨跌幅`);
  
  if (!result.success || !result.data) return null;
  
  const data = result.data as any;
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0]; // 最新价/净值
      const f3 = rawTable.f3?.[0]; // 涨跌幅
      
      if (f2) {
        return {
          code: fundCode,
          name: table.entityName?.replace(`(${fundCode})`, '').trim() || fundCode,
          netValue: parseFloat(f2),
          changePercent: parseFloat(f3 || '0'),
          dailyChange: 0,
          updateDate: new Date().toISOString().split('T')[0],
        };
      }
    }
  } catch (e) {
    console.error('Fund parse error:', e);
  }
  
  return null;
}
