// 提醒横幅组件 - 显示触发的价格提醒，支持自动消失和手动关闭

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TriggeredAlert } from '../hooks/usePriceAlerts';

const AUTO_DISMISS_MS = 8000;

interface AlertBannerProps {
  alerts: TriggeredAlert[];
  onDismiss: (id: string) => void;
}

function SingleAlertBanner({ alert, onDismiss }: { alert: TriggeredAlert; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    // 进入动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // 自动消失
    const timer = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(alert.id);
    });
  };

  const directionLabel = alert.direction === 'above' ? '突破' : '跌破';
  const directionEmoji = alert.direction === 'above' ? '📈' : '📉';
  const priceStr = alert.currentPrice.toFixed(alert.subtype === 'fund' ? 4 : 2);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bannerTouchable}
        onPress={handleDismiss}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <Text style={styles.emoji}>{directionEmoji}</Text>
        </View>
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
            {alert.investmentName}
          </Text>
          <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {directionLabel} ¥{alert.targetPrice.toFixed(alert.subtype === 'fund' ? 4 : 2)} · 当前 ¥{priceStr}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {alerts.map(alert => (
        <SingleAlertBanner key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  banner: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  bannerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16, // extra top padding for status bar clearance
  },
  bannerLeft: {
    marginRight: 10,
  },
  emoji: {
    fontSize: 20,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '300',
  },
});