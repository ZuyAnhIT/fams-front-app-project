import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from '@/theme/tokens';

interface ResponsiveContainerProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  wide?: boolean;
}

export function ResponsiveContainer({ children, style, wide = false }: ResponsiveContainerProps) {
  return (
    <View style={[styles.base, { maxWidth: wide ? layout.wideContentMaxWidth : layout.contentMaxWidth }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignSelf: 'center',
  },
});
