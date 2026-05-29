// Lock screen - PIN entry overlay

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from '../src/i18n/LanguageContext';
import { useAuth } from '../src/hooks/useAuth';

type Mode = 'verify' | 'setup' | 'confirm';

const PIN_LENGTH = 4;

export default function LockScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { verifyPin, setupPin, pinEnabled } = useAuth();

  const [mode, setMode] = useState<Mode>('verify');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorFlash] = useState(new Animated.Value(0));
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (pinEnabled) {
      setMode('verify');
    } else {
      setMode('setup');
    }
  }, [pinEnabled]);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setPin('');
    setConfirmPin('');
    Animated.sequence([
      Animated.timing(errorFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(errorFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setErrorMsg(''));
  };

  const handlePinChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (mode === 'confirm') {
      setConfirmPin(digits);
      if (digits.length === PIN_LENGTH) {
        if (digits === pin) {
          setupPin(digits);
        } else {
          showError('两次输入不一致，请重试');
          setMode('setup');
          setPin('');
          setConfirmPin('');
        }
      }
    } else {
      setPin(digits);
      if (digits.length === PIN_LENGTH) {
        if (mode === 'setup') {
          setMode('confirm');
        } else {
          // verify
          if (verifyPin(digits)) {
            setPin('');
          } else {
            showError(t('common.error') + ': PIN');
          }
        }
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setConfirmPin('');
  };

  const renderDots = (value: string) => {
    return (
      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < value.length ? colors.accent : colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const getTitle = () => {
    if (errorMsg) return errorMsg;
    if (mode === 'setup') return t('lock.title');
    if (mode === 'confirm') return t('common.confirm');
    return t('lock.enterPin');
  };

  const getSubtitle = () => {
    if (mode === 'setup') return 'Enter 4-digit PIN';
    if (mode === 'confirm') return 'Confirm PIN';
    return 'Enter PIN to unlock';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.loss,
            opacity: errorFlash.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
          },
        ]}
      />
      <View style={styles.content}>
        <Text style={[styles.lockIcon]}>🔒</Text>
        <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getSubtitle()}
        </Text>

        {renderDots(mode === 'confirm' ? confirmPin : pin)}

        <TextInput
          style={[
            styles.hiddenInput,
            { color: colors.text },
          ]}
          value={mode === 'confirm' ? confirmPin : pin}
          onChangeText={handlePinChange}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          autoFocus
          secureTextEntry={false}
          caretHidden
        />

        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: colors.cardSecondary }]}
          onPress={handleClear}
        >
          <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>清除</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  clearBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});