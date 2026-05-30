// Apple 风格 Section Header — 21px/600 标题 + 可选右侧操作

import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function SectionHeader({ title, action, onAction, style }: SectionHeaderProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
          marginTop: spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.tagline,
          { color: colors.ink },
        ]}
      >
        {title}
      </Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text
            style={[
              typography.caption,
              { color: colors.primary },
            ]}
          >
            {action}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
