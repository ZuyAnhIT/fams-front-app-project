import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { MockDevBanner } from '@/features/auth/components/MockDevBanner';

type LoginTab = 'email' | 'phone';

/**
 * Main login screen.
 *
 * - "Email" tab: renders the email + password form
 * - "Số điện thoại" tab: navigates to the dedicated phone-OTP screen
 */
export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<LoginTab>('email');

  // "phone" is not a real in-place tab — selecting it navigates away
  // immediately to /phone-login. Without this, tapping phone then
  // navigating back (Stack.back keeps this same screen instance mounted)
  // left `activeTab` stuck at 'phone', so LoginForm's conditional render
  // never re-appeared and the card collapsed to just the tab row.
  // Resetting on every focus makes this self-healing regardless of the
  // navigation path used to come back (phone-login, 2FA, etc.).
  useFocusEffect(
    useCallback(() => {
      setActiveTab('email');
    }, []),
  );

  const handleSwitchToPhone = () => {
    router.push('/(auth)/phone-login' as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.brandArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={styles.appName}>FAMS</Text>
            <Text style={styles.tagLine}>Factory Attendance Management</Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabRow}>
              {(['email', 'phone'] as LoginTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => {
                    if (tab === 'phone') {
                      handleSwitchToPhone();
                    } else {
                      setActiveTab(tab);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={tab === 'email' ? 'mail-outline' : 'call-outline'}
                    size={16}
                    color={activeTab === tab ? '#1E293B' : '#64748B'}
                    style={styles.tabIcon}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab === 'email' ? 'Email' : 'Số điện thoại'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Form – only shown for email tab */}
            {activeTab === 'email' && (
              <LoginForm onSwitchToPhone={handleSwitchToPhone} />
            )}
          </View>

          {/* ── Footer ── */}
          <MockDevBanner />
          <Text style={styles.footer}>© 2026 FAMS · v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  brandArea: {
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 2,
  },
  tagLine: {
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
  },
});
