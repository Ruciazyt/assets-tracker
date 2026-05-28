// 理财资产类型

import { InvestmentAsset, Currency } from './asset';

export type InvestmentSubtype = 'gold' | 'yuebao' | 'fund' | 'cn-stock' | 'hk-stock';

export interface GoldInvestment extends InvestmentAsset {
  subtype: 'gold';
  productType: '实物金' | '纸黄金' | 'ETF基金';
  purchasePrice: number;
  quantity: number;
  purchaseDate: string;
  brand?: string;
}

export interface YuEBaoInvestment extends InvestmentAsset {
  subtype: 'yuebao';
  share: number;         // 份额
  incomeYesterday: number; // 昨日收益
  sevenDayYield: number;   // 7日年化
}

export interface FundInvestment extends InvestmentAsset {
  subtype: 'fund';
  fundCode: string;
  share: number;
  netValue: number;      // 最新净值
  purchaseCost: number;  // 买入时的净值
}

export interface CNStockInvestment extends InvestmentAsset {
  subtype: 'cn-stock';
  stockCode: string;     // 如 "600539"
  share: number;
  purchasePrice: number; // 买入价格
}

export interface HKStockInvestment extends InvestmentAsset {
  subtype: 'hk-stock';
  stockCode: string;     // 如 "00700"
  share: number;
  purchasePrice: number;
  purchaseCurrency: 'HKD' | 'CNY';
}

export type Investment = GoldInvestment | YuEBaoInvestment | FundInvestment | CNStockInvestment | HKStockInvestment;
