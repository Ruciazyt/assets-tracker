// 汇率 Hook - 提供货币转换功能
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExchangeRates } from '../services/market/fx';

export interface ExchangeRatesHook {
  rateMap: Map<string, number>;
  defaultCurrency: string;
  loading: boolean;
  convertToDefault: (amount: number, fromCurrency: string) => number;
}

export function useExchangeRates(): ExchangeRatesHook {
  const [rateMap, setRateMap] = useState<Map<string, number>>(new Map());
  const [defaultCurrency, setDefaultCurrency] = useState<string>('CNY');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await AsyncStorage.getItem('@assets_tracker/settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDefaultCurrency(parsed.defaultCurrency || 'CNY');
      }
    } catch (e) {
      console.error('useExchangeRates: load settings error', e);
    }
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const [rates, settingsStr] = await Promise.all([
        getExchangeRates(),
        AsyncStorage.getItem('@assets_tracker/settings'),
      ]);
      setRateMap(rates);
      if (settingsStr) {
        const parsed = JSON.parse(settingsStr);
        setDefaultCurrency(parsed.defaultCurrency || 'CNY');
      }
    } catch (e) {
      console.error('useExchangeRates: fetch rates error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convertToDefault = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (!rateMap || rateMap.size === 0) return amount;
      if (fromCurrency === defaultCurrency) return amount;
      if (fromCurrency === 'CNY') return amount;

      const rate = rateMap.get(fromCurrency);
      if (!rate) return amount;

      return amount * rate;
    },
    [rateMap, defaultCurrency]
  );

  return { rateMap, defaultCurrency, loading, convertToDefault };
}