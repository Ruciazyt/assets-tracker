/**
 * 盈亏计算服务
 * 基于实时行情重新计算每个投资品的 dailyPnl / totalPnl / dailyReturn
 *
 * dailyPnl/dailyReturn: 基于 lastPrice（前一天收盘价/昨日净值）计算当日盈亏
 *   - 首次运行（lastPrice == 0）时无昨日数据，显示为 0
 *   - 正常运行时对比昨日收盘价与当前价
 *
 * totalPnl/totalReturn: 基于 purchasePrice（持仓成本）计算累计盈亏
 *
 * newLastPrice 会随结果返回，由调用方写回 AsyncStorage 以供下次刷新使用
 */

import { Investment } from '../types/investment';
import { getGoldPrice } from './market/gold';
import { getCNStockQuote } from './market/cn-stock';
import { getHKStockQuote } from './market/hk-stock';
import { getFundInfo } from './market/fund';
import { getUSDCNYRate } from './market/fx';

// 实时价格缓存（避免同周期内重复请求）
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_TTL_MS = 25 * 1000; // 缓存25秒，比刷新间隔30s略短

export interface InvestmentUpdate {
  id: string;
  newPrice: number;
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

/**
 * 计算单条投资的实时盈亏
 *
 * dailyPnl/dailyReturn: 基于 lastPrice 计算（如无历史则当天无法计算，显示0）
 * totalPnl: 基于成本价计算（累计盈亏）
 * newLastPrice: 当前价格将作为下次刷新的"昨日收盘"参考，写回投资对象
 */
export async function recalculateInvestment(
  inv: Investment
): Promise<InvestmentUpdate & { newLastPrice: number }> {
  const update: InvestmentUpdate & { newLastPrice: number } = {
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
          `gold:${inv.purchasePrice}`,
          async () => {
            const gold = await getGoldPrice();
            return gold?.price ?? null;
          }
        );
        if (currentPrice !== null) {
          update.newPrice = currentPrice;
          update.newLastPrice = currentPrice;

          // dailyPnl: 基于 lastPrice（前一天收盘）计算；首次运行时 lastPrice=0，显示0
          if (inv.lastPrice > 0) {
            update.dailyPnl = (currentPrice - inv.lastPrice) * inv.quantity;
            update.dailyReturn = ((currentPrice - inv.lastPrice) / inv.lastPrice) * 100;
          }
          // totalPnl: 基于持仓成本（买入价）计算累计盈亏
          update.totalPnl = (currentPrice - inv.purchasePrice) * inv.quantity;
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

          if (inv.lastPrice > 0) {
            update.dailyPnl = (currentPrice - inv.lastPrice) * inv.share;
            update.dailyReturn = ((currentPrice - inv.lastPrice) / inv.lastPrice) * 100;
          }
          update.totalPnl = (currentPrice - inv.purchasePrice) * inv.share;
        }
        break;
      }

      case 'hk-stock': {
        const currentPrice = await getCachedPrice(
          `hk-stock:${inv.stockCode}`,
          async () => {
            const quote = await getHKStockQuote(inv.stockCode);
            return quote?.priceCNY ?? quote?.priceHKD ?? null;
          }
        );
        if (currentPrice !== null) {
          update.newPrice = currentPrice;
          update.newLastPrice = currentPrice;

          if (inv.lastPrice > 0) {
            update.dailyPnl = (currentPrice - inv.lastPrice) * inv.share;
            update.dailyReturn = ((currentPrice - inv.lastPrice) / inv.lastPrice) * 100;
          }
          // 港股累计盈亏按HKD计算，汇总时由调用方换算
          update.totalPnl = (currentPrice - inv.purchasePrice) * inv.share;
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

          if (inv.lastPrice > 0) {
            update.dailyPnl = (currentPrice - inv.lastPrice) * inv.share;
            update.dailyReturn = ((currentPrice - inv.lastPrice) / inv.lastPrice) * 100;
          }
          update.totalPnl = (currentPrice - inv.purchaseCost) * inv.share;
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

/**
 * 批量重新计算所有投资的实时盈亏
 *
 * 返回值中包含 newLastPrice，调用方应将对应投资的 lastPrice 更新后写回 AsyncStorage。
 * 更新策略：
 *   - newLastPrice > 0 → 用 newLastPrice 替换 lastPrice（正常价格更新）
 *   - newLastPrice == 0（如余额宝）→ 保持原 lastPrice 不变
 */
export async function recalculateAllInvestments(
  invs: Investment[]
): Promise<(InvestmentUpdate & { newLastPrice: number })[]> {
  priceCache.clear();
  const results = await Promise.all(invs.map(inv => recalculateInvestment(inv)));
  return results;
}