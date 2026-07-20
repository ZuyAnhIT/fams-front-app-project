import { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface KeyboardAwareModalSheetProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onSheetLayout?: (layout: LayoutRectangle) => void;
}

/**
 * Wraps bottom-sheet modal content so inputs shift above the software keyboard.
 */
export function KeyboardAwareModalSheet({
  children,
  style,
  onSheetLayout,
}: KeyboardAwareModalSheetProps) {
  const sheetLayout = useRef<LayoutRectangle>({ x: 0, y: 0, width: 0, height: 0 });

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, justifyContent: 'flex-end' }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <View
        onLayout={(e) => {
          sheetLayout.current = e.nativeEvent.layout;
          onSheetLayout?.(e.nativeEvent.layout);
        }}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}
