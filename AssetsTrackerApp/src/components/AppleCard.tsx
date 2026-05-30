// Apple 风格卡片 — 白底 + lg 圆角 + 轻阴影，可选点击/长按

import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

// spacing key 类型
type SpacingKey = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'section';

interface AppleCardProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  padding?: SpacingKey;
  noShadow?: boolean;
}

export default function AppleCard({ children, onPress, onLongPress, style, padding = 'lg', noShadow }: AppleCardProps) {
  const { colors, spacing, radius, shadows } = useAppTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.canvas,
    borderRadius: radius.lg,
    padding: spacing[padding],
    ...(!noShadow ? shadows.card : {}),
    ...style,
  };

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
