// 汇率服务 - 支持日元等主要货币

import { query } from './common';

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

// 获取美元/人民币汇率 (USD/CNY)
export async function getUSDCNYRate(): Promise<ExchangeRate | null> {
  const result = await query(`美元兑人民币 USD/CNY 汇率 最新`);

  if (!result.success || !result.data) return null;


  const data = result.data as any;
  try {
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0];

      if (f2) {
        return {
          from: 'USD',
          to: 'CNY',
          rate: parseFloat(f2),
          change: 0,
          changePercent: 0,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('USD/CNY rate parse error:', e);
  }

  return null;
}

// 获取日元汇率 (JPY/CNY)
export async function getJPYRate(): Promise<ExchangeRate | null> {
  // 先查 USD/CNY
  const usdCnyResult = await getUSDCNYRate();
  if (!usdCnyResult) return null;
  const usdCny = usdCnyResult.rate;

  // 再查 USD/JPY 实时汇率
  const usdJpyResult = await query<any>(`美元兑日元 USD/JPY 汇率 最新`);
  let usdJpy = 150; // 默认 fallback
  if (usdJpyResult.success && usdJpyResult.data) {
    const data = usdJpyResult.data as any;
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0];
      if (f2) {
        usdJpy = parseFloat(f2);
        break;
      }
    }
  }

  // JPY/CNY = USD/CNY / USD/JPY
  const jpyCny = usdJpy > 0 ? usdCny / usdJpy : usdCny / 150;

  return {
    from: 'JPY',
    to: 'CNY',
    rate: parseFloat(jpyCny.toFixed(4)),
    change: 0,
    changePercent: 0,
    timestamp: new Date().toISOString(),
  };
}

// 批量获取所有需要的汇率，返回货币->CNY汇率 Map
// rateMap[currency] = how many CNY per 1 unit of that currency
export async function getExchangeRates(): Promise<Map<string, number>> {
  const [usdResult, hkdResult, jpyResult] = await Promise.allSettled([
    getUSDCNYRate(),
    getExchangeRate('HKD', 'CNY'),
    getJPYRate(),
  ]);

  const usdCny = usdResult.status === 'fulfilled' && usdResult.value ? usdResult.value.rate : 1;
  const hkdCny = hkdResult.status === 'fulfilled' && hkdResult.value ? hkdResult.value.rate : usdCny / 7.8;
  const jpyCny = jpyResult.status === 'fulfilled' && jpyResult.value ? jpyResult.value.rate : usdCny / 150;

  // Rates expressed as: 1 unit of currency = X CNY
  const rateMap = new Map<string, number>([
    ['USD', usdCny],
    ['HKD', hkdCny],
    ['JPY', jpyCny],
    ['CNY', 1],
  ]);

  return rateMap;
}
