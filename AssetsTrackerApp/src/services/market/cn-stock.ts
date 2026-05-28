// A股股票行情服务

import { query } from './common';

export interface StockQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;     // 成交量
  amount: number;     // 成交额
  high: number;
  low: number;
  open: number;
  close: number;      // 昨收
  timestamp: string;
}

// 获取A股股票行情
export async function getCNStockQuote(stockCode: string): Promise<StockQuote | null> {
  // 自动补充交易所后缀
  const code = stockCode.length === 6 
    ? (stockCode.startsWith('6') ? `${stockCode}.SH` : `${stockCode}.SZ`)
    : stockCode;
  
  const result = await query(`${stockCode} 股票 最新价 成交量 涨跌幅`);
  
  if (!result.success || !result.data) return null;
  
  const data = result.data as any;
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0]; // 最新价
      const f3 = rawTable.f3?.[0]; // 涨跌幅
      const f4 = rawTable.f4?.[0]; // 涨跌额
      const f5 = rawTable.f5?.[0]; // 成交量
      const f6 = rawTable.f6?.[0]; // 成交额
      const f8 = rawTable.f8?.[0]; // 换手率
      
      if (f2) {
        const change = parseFloat(f4 || '0');
        const close = parseFloat(f2) - change;
        return {
          code: stockCode,
          name: table.entityName?.split('(')[0]?.trim() || stockCode,
          price: parseFloat(f2),
          change,
          changePercent: parseFloat(f3 || '0'),
          volume: parseInt(f5 || '0'),
          amount: parseFloat(f6 || '0'),
          high: 0, low: 0, open: 0, close,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('CN Stock parse error:', e);
  }
  
  return null;
}
