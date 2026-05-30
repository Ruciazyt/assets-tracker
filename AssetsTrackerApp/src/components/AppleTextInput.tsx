// Apple 风格输入框 — pill 圆角 + 细边框 + 17px 正文

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

interface AppleTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightElement?: React.ReactNode;
}

export default function AppleTextInput({
  label,
  error,
  containerStyle,
  rightElement,
  style,
  ...rest
}: AppleTextInputProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.sm }, containerStyle]}>
      {label ? (
        <Text
          style={[
            typography.captionStrong,
            {
              color: colors.textMuted,
              marginBottom: spacing.xxs,
              marginLeft: spacing.sm,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: focused ? colors.canvas : colors.parchment,
          borderWidth: 1,
          borderColor: error ? colors.loss : focused ? colors.primary : colors.hairline,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          minHeight: 44,
        }}
      >
        <TextInput
          style={[
            typography.body,
            {
              flex: 1,
              color: colors.ink,
              paddingVertical: spacing.xs,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightElement}
      </View>
      {error ? (
        <Text
          style={[
            typography.finePrint,
            {
              color: colors.loss,
              marginTop: spacing.xxs,
              marginLeft: spacing.sm,
            },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
