// Auth Context - PIN/password protection for app lock

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PIN_KEY = '@assets_tracker/pin';

interface AuthContextType {
  pinEnabled: boolean;
  storedPin: string | null;
  isLocked: boolean;
  verifyPin: (pin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  lock: () => void;
  unlock: () => void;
}

const AuthContext = createContext<AuthContextType>({
  pinEnabled: false,
  storedPin: null,
  isLocked: false,
  verifyPin: async () => false,
  setupPin: async () => {},
  clearPin: async () => {},
  lock: () => {},
  unlock: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

/** Hash a PIN string using SHA-256 */
async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  return digest;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [storedPinHash, setStoredPinHash] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    loadPin();
  }, []);

  const loadPin = async () => {
    try {
      const hash = await AsyncStorage.getItem(PIN_KEY);
      if (hash) {
        setStoredPinHash(hash);
        setPinEnabled(true);
        setIsLocked(true);
      }
    } catch (e) {
      // ignore
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!storedPinHash) return false;
    const hash = await hashPin(pin);
    return hash === storedPinHash;
  };

  const setupPin = async (pin: string): Promise<void> => {
    const hash = await hashPin(pin);
    await AsyncStorage.setItem(PIN_KEY, hash);
    setStoredPinHash(hash);
    setPinEnabled(true);
    setIsLocked(false);
  };

  const clearPin = async (): Promise<void> => {
    await AsyncStorage.removeItem(PIN_KEY);
    setStoredPinHash(null);
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
        storedPin: storedPinHash,
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