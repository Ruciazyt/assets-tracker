// 汇率服务

import { query, getDataTables, extractField } from './common';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export async function getUSDCNYRate(): Promise<ExchangeRate | null> {
  const result = await query<any>('美元兑人民币 USD/CNY 汇率 最新');
  if (!result.success || !result.data) return null;

  const tables = getDataTables(result.data);
  for (const table of tables) {
    const rate = extractField(table, '汇率') || extractField(table, '最新价');
    if (rate && parseFloat(rate) > 0) {
      return { from: 'USD', to: 'CNY', rate: parseFloat(rate), timestamp: new Date().toISOString() };
    }
  }
  return null;
}

export async function getJPYRate(): Promise<ExchangeRate | null> {
  const usdCny = await getUSDCNYRate();
  if (!usdCny) return null;

  const result = await query<any>('美元兑日元 USD/JPY 汇率 最新');
  let usdJpy = 150;
  if (result.success && result.data) {
    for (const table of getDataTables(result.data)) {
      const rate = extractField(table, '汇率') || extractField(table, '最新价');
      if (rate && parseFloat(rate) > 0) { usdJpy = parseFloat(rate); break; }
    }
  }

  const jpyCny = usdJpy > 0 ? usdCny.rate / usdJpy : usdCny.rate / 150;
  return { from: 'JPY', to: 'CNY', rate: parseFloat(jpyCny.toFixed(4)), timestamp: new Date().toISOString() };
}

export async function getExchangeRates(): Promise<Map<string, number>> {
  const [usdR, hkdR, jpyR] = await Promise.allSettled([getUSDCNYRate(), query<any>('HKD/CNY 汇率'), getJPYRate()]);
  const usdCny = usdR.status === 'fulfilled' && usdR.value ? usdR.value.rate : 7.2;
  const jpyCny = jpyR.status === 'fulfilled' && jpyR.value ? jpyR.value.rate : usdCny / 150;
  let hkdCny = usdCny / 7.8;
  if (hkdR.status === 'fulfilled' && hkdR.value?.success && hkdR.value.data) {
    for (const table of getDataTables(hkdR.value.data)) {
      const rate = extractField(table, '汇率') || extractField(table, '最新价');
      if (rate && parseFloat(rate) > 0) { hkdCny = parseFloat(rate); break; }
    }
  }
  return new Map([['USD', usdCny], ['HKD', hkdCny], ['JPY', jpyCny], ['CNY', 1]]);
}
