import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@assets_tracker/price_history';

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  goldPrice?: number;
  jpyRate?: number;
  totalValue: number;
  totalDailyPnl: number;
  totalPnl: number;
}

/** Save daily snapshot (call once per day or on app startup) */
export async function saveDailySnapshot(snapshot: Omit<DailySnapshot, 'date'>): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const existing = await AsyncStorage.getItem(HISTORY_KEY);
  const history: DailySnapshot[] = existing ? JSON.parse(existing) : [];
  const todayIdx = history.findIndex(s => s.date === date);
  if (todayIdx >= 0) {
    history[todayIdx] = { ...history[todayIdx], ...snapshot, date };
  } else {
    history.push({ ...snapshot, date });
  }
  // Keep last 365 days
  const trimmed = history.slice(-365);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/** Get history for last N days */
export async function getHistory(days: number = 30): Promise<DailySnapshot[]> {
  const existing = await AsyncStorage.getItem(HISTORY_KEY);
  const history: DailySnapshot[] = existing ? JSON.parse(existing) : [];
  return history.slice(-days);
}