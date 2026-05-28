// 价格提醒 Hook - 在每次 useAutoRefresh 周期检查规则是否触发

import { useRef, useState } from 'react';
import { AlertRule } from '../services/alertService';
import {
  getAlertRules,
  toggleAlertRule,
} from '../services/alertService';
import { getGoldPrice } from '../services/market/gold';
import { getCNStockQuote } from '../services/market/cn-stock';
import { getHKStockQuote } from '../services/market/hk-stock';
import { getFundInfo } from '../services/market/fund';

/**
 * 获取投资品种的当前价格
 * Returns null if unavailable (market closed, API error, etc.)
 */
async function fetchCurrentPrice(rule: AlertRule): Promise<number | null> {
  try {
    switch (rule.subtype) {
      case 'gold': {
        const result = await getGoldPrice();
        return result?.price ?? null;
      }
      case 'cn-stock': {
        if (!rule.stockCode) return null;
        const result = await getCNStockQuote(rule.stockCode);
        return result?.price ?? null;
      }
      case 'hk-stock': {
        if (!rule.stockCode) return null;
        const result = await getHKStockQuote(rule.stockCode);
        return result?.priceCNY ?? null;
      }
      case 'fund': {
        if (!rule.fundCode) return null;
        const result = await getFundInfo(rule.fundCode);
        return result?.netValue ?? null;
      }
      case 'yuebao': {
        // 余额宝类品种暂不支持
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * 判断规则是否被触发
 */
function isTriggered(rule: AlertRule, currentPrice: number): boolean {
  if (rule.direction === 'above') {
    return currentPrice >= rule.targetPrice;
  } else {
    return currentPrice <= rule.targetPrice;
  }
}

export interface TriggeredAlert extends AlertRule {
  currentPrice: number;
}

/**
 * usePriceAlerts - 在每次 refresh 周期调用 checkAlerts() 检查触发状态
 *
 * 用法:
 *   const { triggeredAlerts, checkAlerts } = usePriceAlerts();
 *   // 在 useAutoRefresh 的 onRefresh 回调中调用 checkAlerts()
 */
export function usePriceAlerts() {
  // 已触发过的规则ID集合 (用于避免同一规则重复触发)
  const firedRef = useRef<Set<string>>(new Set());
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);

  /**
   * 检查所有已启用的规则，如有触发则返回 newly triggered 列表
   */
  const checkAlerts = async (): Promise<void> => {
    const rules = await getAlertRules();
    const enabledRules = rules.filter(r => r.enabled);
    const newlyTriggered: TriggeredAlert[] = [];

    for (const rule of enabledRules) {
      if (firedRef.current.has(rule.id)) continue;

      const currentPrice = await fetchCurrentPrice(rule);
      if (currentPrice === null) continue;

      if (isTriggered(rule, currentPrice)) {
        firedRef.current.add(rule.id);
        await toggleAlertRule(rule.id, false); // 触发后自动禁用
        newlyTriggered.push({ ...rule, currentPrice });
      }
    }

    if (newlyTriggered.length > 0) {
      setTriggeredAlerts(prev => [...prev, ...newlyTriggered]);
    }
  };

  /**
   * 手动清除已显示的提醒 (调用后 AlertBanner 从 UI 上移除)
   */
  const dismissAlert = (id: string) => {
    setTriggeredAlerts(prev => prev.filter(a => a.id !== id));
  };

  /**
   * 全部清除
   */
  const dismissAll = () => {
    setTriggeredAlerts([]);
  };

  return { triggeredAlerts, checkAlerts, dismissAlert, dismissAll };
}