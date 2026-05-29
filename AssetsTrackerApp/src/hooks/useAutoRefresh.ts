import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@assets_tracker/settings';

/**
 * Hook that auto-refreshes data at a user-configured interval.
 * Re-reads refreshInterval from AsyncStorage on every tick so changes
 * take effect without restarting the component.
 *
 * @param onRefresh  callback to invoke on each refresh
 */
export function useAutoRefresh(onRefresh: () => void): void {
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        const settings = raw ? JSON.parse(raw) : {};
        const intervalSec = Number(settings.refreshInterval ?? 0);

        if (intervalSec > 0) {
          timerId = setInterval(async () => {
            // Re-read interval on every tick so setting changes take effect immediately
            try {
              const currentRaw = await AsyncStorage.getItem(SETTINGS_KEY);
              const currentSettings = currentRaw ? JSON.parse(currentRaw) : {};
              const currentInterval = Number(currentSettings.refreshInterval ?? 0);
              if (currentInterval > 0) {
                callbackRef.current();
              }
            } catch (e) {
              console.error('[useAutoRefresh] tick error:', e);
            }
          }, intervalSec * 1000);
        }
      } catch (e) {
        console.error('[useAutoRefresh] failed to read interval:', e);
      }
    };

    start();

    return () => {
      if (timerId !== null) clearInterval(timerId);
    };
  }, []);
}