// 价格提醒服务 - 存储和管理价格提醒规则

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InvestmentSubtype } from '../types/investment';

const ALERT_RULES_KEY = '@assets_tracker/alert_rules';

export interface AlertRule {
  id: string;
  investmentId: string;       // 关联的投资记录ID (来自AsyncStorage)
  investmentName: string;    // 投资名称 (如 "实物金-黄金钱包")
  subtype: InvestmentSubtype;
  targetPrice: number;       // 目标价格
  direction: 'above' | 'below'; // 触发方向
  enabled: boolean;
  createdAt: string;
  // 便于直接查询的字段
  stockCode?: string;        // 股票代码 (cn-stock/hk-stock)
  fundCode?: string;         // 基金代码 (fund)
}

/**
 * 保存/更新一条提醒规则
 */
export async function saveAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): Promise<AlertRule> {
  const rules = await getAlertRules();
  const now = new Date().toISOString();

  const existing = rules.find(r => r.id === rule.investmentId);
  if (existing) {
    // 更新现有规则
    const updated: AlertRule = { ...existing, ...rule, id: existing.id };
    const idx = rules.findIndex(r => r.id === existing.id);
    rules[idx] = updated;
    await AsyncStorage.setItem(ALERT_RULES_KEY, JSON.stringify(rules));
    return updated;
  }

  // 新建规则
  const newRule: AlertRule = {
    ...rule,
    id: crypto.randomUUID(),
    createdAt: now,
  };
  rules.push(newRule);
  await AsyncStorage.setItem(ALERT_RULES_KEY, JSON.stringify(rules));
  return newRule;
}

/**
 * 获取所有提醒规则
 */
export async function getAlertRules(): Promise<AlertRule[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERT_RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 删除一条提醒规则
 */
export async function deleteAlertRule(id: string): Promise<void> {
  const rules = await getAlertRules();
  const filtered = rules.filter(r => r.id !== id);
  await AsyncStorage.setItem(ALERT_RULES_KEY, JSON.stringify(filtered));
}

/**
 * 启用/禁用规则
 */
export async function toggleAlertRule(id: string, enabled: boolean): Promise<void> {
  const rules = await getAlertRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx !== -1) {
    rules[idx] = { ...rules[idx], enabled };
    await AsyncStorage.setItem(ALERT_RULES_KEY, JSON.stringify(rules));
  }
}