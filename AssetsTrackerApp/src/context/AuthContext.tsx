// Auth Context - PIN/password protection for app lock

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = '@assets_tracker/pin';

interface AuthContextType {
  pinEnabled: boolean;
  storedPin: string | null;
  isLocked: boolean;
  verifyPin: (pin: string) => boolean;
  setupPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  lock: () => void;
  unlock: () => void;
}

const AuthContext = createContext<AuthContextType>({
  pinEnabled: false,
  storedPin: null,
  isLocked: false,
  verifyPin: () => false,
  setupPin: async () => {},
  clearPin: async () => {},
  lock: () => {},
  unlock: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    loadPin();
  }, []);

  const loadPin = async () => {
    try {
      const pin = await AsyncStorage.getItem(PIN_KEY);
      if (pin) {
        setStoredPin(pin);
        setPinEnabled(true);
        setIsLocked(true);
      }
    } catch (e) {
      // ignore
    }
  };

  const verifyPin = (pin: string): boolean => {
    return pin === storedPin;
  };

  const setupPin = async (pin: string): Promise<void> => {
    await AsyncStorage.setItem(PIN_KEY, pin);
    setStoredPin(pin);
    setPinEnabled(true);
    setIsLocked(false);
  };

  const clearPin = async (): Promise<void> => {
    await AsyncStorage.removeItem(PIN_KEY);
    setStoredPin(null);
    setPinEnabled(false);
    setIsLocked(false);
  };

  const lock = () => {
    if (pinEnabled) {
      setIsLocked(true);
    }
  };

  const unlock = () => {
    setIsLocked(false);
  };

  return (
    <AuthContext.Provider
      value={{
        pinEnabled,
        storedPin,
        isLocked,
        verifyPin,
        setupPin,
        clearPin,
        lock,
        unlock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}