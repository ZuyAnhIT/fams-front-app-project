import { useEffect, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7569/ingest/cdcc833e-b1f1-4602-a45f-9f9830cbf8bc';
const DEBUG_SESSION = '03d2d2';

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: 'pre-fix',
    }),
  }).catch(() => {});
  // #endregion
}

interface KeyboardAwareModalSheetProps {
  children: React.ReactNode;
  /** For debug logs — e.g. "PasswordChangeForm" */
  debugName: string;
  style?: StyleProp<ViewStyle>;
  onSheetLayout?: (layout: LayoutRectangle) => void;
}

/**
 * Wraps bottom-sheet modal content so inputs shift above the software keyboard.
 * Includes debug instrumentation (session 03d2d2).
 */
export function KeyboardAwareModalSheet({
  children,
  debugName,
  style,
  onSheetLayout,
}: KeyboardAwareModalSheetProps) {
  const sheetLayout = useRef<LayoutRectangle>({ x: 0, y: 0, width: 0, height: 0 });
  const hasKAV = true;

  useEffect(() => {
    debugLog(
      'keyboard-aware-sheet.tsx:mount',
      'KeyboardAwareModalSheet mounted',
      { debugName, platform: Platform.OS, hasKeyboardAvoidingView: hasKAV },
      'A',
    );

    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(eventName, (e) => {
      const kbHeight = e.endCoordinates.height;
      const kbTop = e.endCoordinates.screenY;
      const sheet = sheetLayout.current;
      const sheetBottom = sheet.y + sheet.height;
      const overlap = sheetBottom - kbTop;

      debugLog(
        'keyboard-aware-sheet.tsx:keyboard',
        'keyboard shown — overlap check',
        {
          debugName,
          keyboardHeight: kbHeight,
          keyboardTopY: kbTop,
          sheetY: sheet.y,
          sheetHeight: sheet.height,
          sheetBottomY: sheetBottom,
          estimatedOverlapPx: overlap > 0 ? overlap : 0,
        },
        'B',
      );
    });

    return () => sub.remove();
  }, [debugName]);

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
          debugLog(
            'keyboard-aware-sheet.tsx:layout',
            'sheet layout measured',
            {
              debugName,
              ...e.nativeEvent.layout,
            },
            'D',
          );
        }}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

/** Log when an input inside a modal receives focus */
export function logModalInputFocus(debugName: string, fieldName: string) {
  debugLog(
    'keyboard-aware-sheet.tsx:focus',
    'input focused in modal',
    { debugName, fieldName, platform: Platform.OS },
    'C',
  );
}
