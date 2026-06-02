// Apple 风格按钮 — primary(blue pill) / secondary(ghost pill)
// 按压动画: scale(0.95)，与 Apple 系统一致

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

interface AppleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode; // 左侧图标
}

export default function AppleButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}: AppleButtonProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  // 背景色
  const bgMap: Record<string, string> = {
    primary: colors.primary,
    secondary: 'transparent',
    danger: colors.loss,
  };

  // 文字色
  const textMap: Record<string, string> = {
    primary: colors.canvas,
    secondary: colors.primary,
    danger: colors.canvas,
  };

  // 边框
  const borderMap: Record<string, string | undefined> = {
    primary: undefined,
    secondary: colors.primary,
    danger: undefined,
  };

  const borderWidth = variant === 'secondary' ? 1 : 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          {
            backgroundColor: disabled ? colors.disabled : bgMap[variant],
            borderRadius: radius.pill,
            borderWidth,
            borderColor: borderMap[variant],
            paddingVertical: spacing.sm + 2,
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            minHeight: 44,
          },
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={textMap[variant]}
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {icon}
            <Text
              style={[
                typography.button,
                {
                  color: disabled ? colors.textMuted : textMap[variant],
                  textAlign: 'center',
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
