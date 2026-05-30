/**
 * 盈亏计算服务
 * 基于实时行情重新计算每个投资品的 dailyPnl / totalPnl / dailyReturn
 */

import { Investment } from '../types/investment.js';
import { getGoldPrice } from './market/gold.js';
import { getCNStockQuote } from './market/cn-stock.js';
import { getHKStockQuote } from './market/hk-stock.js';
import { getFundInfo } from './market/fund.js';

// 实时价格缓存（避免同周期内重复请求）
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_TTL_MS = 25 * 1000; // 缓存25秒，比刷新间隔30s略短

export interface InvestmentUpdate {
  id: string;
  newPrice: number;
  /** Persist as lastPrice so next refresh uses it as "yesterday close" */
  newLastPrice: number;
  dailyPnl: number;
  dailyReturn: number;
  totalPnl: number;
}

/** 获取缓存价格（防止同批次重复查询同一标的） */
async function getCachedPrice(key: string, fetcher: () => Promise<number | null>): Promise<number | null> {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }
  const price = await fetcher();
  if (price !== null) {
    priceCache.set(key, { price, timestamp: Date.now() });
  }
  return price;
}

/** 计算单条投资的实时盈亏 */
export async function recalculateInvestment(inv: Investment): Promise<InvestmentUpdate> {
  const update: InvestmentUpdate = {
    id: inv.id,
    newPrice: inv.lastPrice,
    newLastPrice: inv.lastPrice,
    dailyPnl: 0,
    dailyReturn: 0,
    totalPnl: 0,
  };

  try {
    switch (inv.subtype) {
      case 'gold': {
        const currentPrice = await getCachedPrice(
          'gold:spot',
          async () => {
            const gold = await getGoldPrice();
            return gold?.price ?? null;
          }
        );
        if (currentPrice !== null) {
          update.newPrice = currentPrice;
          update.newLastPrice = currentPrice;
          // lastPrice = yesterday's close, dailyPnl = today's change
          const lastPrice = inv.lastPrice;
          update.dailyPnl = lastPrice > 0 ? (currentPrice - lastPrice) * inv.quantity : 0;
          update.dailyReturn = lastPrice > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;
          update.totalPnl = currentPrice * inv.quantity - inv.cost;
        }
        break;
      }

      case 'cn-stock': {
        const currentPrice = await getCachedPrice(
          `cn-stock:${inv.stockCode}`,
          async () => {
            const quote = await getCNStockQuote(inv.stockCode);
            return quote?.price ?? null;
          }
        );
        if (currentPrice !== null) {
          update.newPrice = currentPrice;
          update.newLastPrice = currentPrice;
          const lastPrice = inv.lastPrice;
          update.dailyPnl = lastPrice > 0 ? (currentPrice - lastPrice) * inv.share : 0;
          update.dailyReturn = lastPrice > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;
          update.totalPnl = currentPrice * inv.share - inv.cost;
        }
        break;
      }

      case 'hk-stock': {
        const currentPrice = await getCachedPrice(
          `hk-stock:${inv.stockCode}`,
          async () => {
            const quote = await getHKStockQuote(inv.stockCode);
            // 港股换算为CNY计价
            return quote?.priceCNY ?? quote?.priceHKD ?? null;
          }
        );
        if (currentPrice !== null) {
          update.newPrice = currentPrice;
          update.newLastPrice = currentPrice;
          const lastPrice = inv.lastPrice;
          update.dailyPnl = lastPrice > 0 ? (currentPrice - lastPrice) * inv.share : 0;
          update.dailyReturn = lastPrice > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;
          update.totalPnl = currentPrice * inv.share - inv.cost;
        }
        break;
      }

      case 'fund': {
        const currentPrice = await getCachedPrice(
          `fund:${inv.fundCode}`,
          async () => {
            const info = await getFundInfo(inv.fundCode);
            return info?.netValue ?? null;
          }
        );
        if (currentPrice !== null) {
          update.newPrice = currentPrice;
          update.newLastPrice = currentPrice;
          const lastPrice = inv.lastPrice;
          update.dailyPnl = lastPrice > 0 ? (currentPrice - lastPrice) * inv.share : 0;
          update.dailyReturn = lastPrice > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;
          update.totalPnl = currentPrice * inv.share - inv.cost;
        }
        break;
      }

      case 'yuebao': {
        // 余额宝无实时API，固定为0
        update.newPrice = inv.lastPrice;
        update.newLastPrice = inv.lastPrice;
        update.dailyPnl = 0;
        update.dailyReturn = 0;
        update.totalPnl = 0;
        break;
      }
    }
  } catch (e) {
    console.error(`[profitCalculator] Failed to recalculate ${inv.id}:`, e);
  }

  return update;
}

/** 批量重新计算所有投资的实时盈亏 */
export async function recalculateAllInvestments(invs: Investment[]): Promise<InvestmentUpdate[]> {
  // 清空缓存，确保每次刷新拿到新价格
  priceCache.clear();

  const results = await Promise.all(invs.map(inv => recalculateInvestment(inv)));
  return results;
}
