// 资产基础类型

export type AssetType = 'cash' | 'fixed' | 'investment';
export type Currency = 'CNY' | 'USD' | 'HKD' | 'JPY' | 'EUR' | 'GBP';

export interface BaseAsset {
  id: string;
  type: AssetType;
  name: string;
  amount: number;
  currency: Currency;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashAsset extends BaseAsset {
  type: 'cash';
  subtype: 'cash' | 'bank' | 'alipay' | 'wechat' | 'other';
  institution?: string;
}

export interface FixedAsset extends BaseAsset {
  type: 'fixed';
  subtype: 'property' | 'vehicle' | 'equipment' | 'other';
  purchaseDate: string;
  purchasePrice: number;
  depreciationMethod?: 'straight-line' | 'declining' | 'none';
  usefulYears?: number;
  residualValue?: number;
}

export interface InvestmentAsset extends BaseAsset {
  type: 'investment';
  cost: number;
  costBasis: 'FIFO' | 'AVG';
  lastPrice: number;
  dailyPnl: number;
  totalPnl: number;
  dailyReturn: number;
}

export type Asset = CashAsset | FixedAsset | InvestmentAsset;
