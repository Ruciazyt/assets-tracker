// Apple 风格分段控制器 — 替代 Paper SegmentedButtons
// 选中=蓝底白字pill，未选=parchment底+ink文字

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

interface Segment {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  selected: string;
  onValueChange: (value: string) => void;
  scrollable?: boolean;
  style?: ViewStyle;
}

export default function SegmentedControl({
  segments,
  selected,
  onValueChange,
  scrollable = false,
  style,
}: SegmentedControlProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    ...style,
  };

  const content = segments.map((seg) => {
    const isSelected = seg.value === selected;
    return (
      <TouchableOpacity
        key={seg.value}
        onPress={() => onValueChange(seg.value)}
        activeOpacity={0.7}
        style={{
          backgroundColor: isSelected ? colors.primary : colors.parchment,
          borderRadius: radius.pill,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          minHeight: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: isSelected ? colors.canvas : colors.ink,
              fontWeight: isSelected ? '600' : '400',
            },
          ]}
        >
          {seg.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={containerStyle}
        contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.md }}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}
