import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { ResponsiveContainer } from '@/components/ui/responsive-container';

import { useCreateTenant } from '../hooks/use-create-tenant';
import type {
  AppTimezone,
  SubscriptionPlan,
  TenantIndustry,
  WizardStep,
} from '../types/Tenant';
import { WIZARD_STEP_COUNT, WIZARD_STEP_LABELS } from '../types/Tenant';
import {
  DEFAULT_PLAN_DETAILS,
  INDUSTRY_LABELS,
  PLAN_COLORS,
  TIMEZONE_LABELS,
  formatEmployeeLimit,
  formatPlanPrice,
  formatStorageLimit,
  generateSlug,
} from '../utils/tenant.utils';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Tên công ty ít nhất 2 ký tự').max(80),
  slug: z
    .string()
    .min(2, 'Domain ít nhất 2 ký tự')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Chỉ được dùng chữ thường, số và dấu gạch ngang'),
  logo_url: z.string().url('URL logo không hợp lệ').optional().or(z.literal('')),
  industry: z.enum([
    'manufacturing', 'retail', 'construction', 'logistics',
    'hospitality', 'healthcare', 'education', 'other',
  ] as const),
});

const step2Schema = z.object({
  language: z.enum(['vi', 'en', 'ja', 'ko'] as const),
  timezone: z.enum([
    'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'UTC',
  ] as const),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải ở dạng #RRGGBB'),
  notifications_enabled: z.boolean(),
  late_checkin_alert: z.boolean(),
  checkin_early_minutes: z.number().int().min(0).max(120),
  geofence_radius_meters: z.number().int().min(50).max(2000),
  require_face_id: z.boolean(),
  random_check_enabled: z.boolean(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

function OptionPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.optionGrid}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.optionChip, value === opt.value && styles.optionChipActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: value === opt.value }}
        >
          <Text
            style={[
              styles.optionChipText,
              value === opt.value && styles.optionChipTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchLabelGroup}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && <Text style={styles.switchDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
        thumbColor={value ? '#2563EB' : '#94A3B8'}
      />
    </View>
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ current }: { current: WizardStep }) {
  return (
    <View style={styles.stepBar}>
      {([1, 2, 3] as WizardStep[]).map((step) => (
        <View key={step} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              current === step && styles.stepCircleActive,
              current > step && styles.stepCircleDone,
            ]}
          >
            {current > step ? (
              <Text style={styles.stepDoneText}>✓</Text>
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  current === step && styles.stepNumberActive,
                ]}
              >
                {step}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              current === step && styles.stepLabelActive,
            ]}
          >
            {WIZARD_STEP_LABELS[step]}
          </Text>
          {step < WIZARD_STEP_COUNT && <View style={styles.stepLine} />}
        </View>
      ))}
    </View>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

interface TenantSetupWizardProps {
  onCancel?: () => void;
}

export function TenantSetupWizard({ onCancel }: TenantSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('starter');

  const { createTenant, isPending, error } = useCreateTenant();

  // ── Step 1 form ───────────────────────────────────────────────────────────
  const {
    control: ctrl1,
    handleSubmit: submit1,
    setValue: setVal1,
    formState: { errors: err1 },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: '',
      slug: '',
      logo_url: '',
      industry: 'manufacturing',
    },
  });

  const handleNameChange = (text: string, onChange: (v: string) => void) => {
    onChange(text);
    // Only auto-fill slug if user hasn't manually edited it
    setVal1('slug', generateSlug(text), { shouldValidate: false });
  };

  // ── Step 2 form ───────────────────────────────────────────────────────────
  const {
    control: ctrl2,
    handleSubmit: submit2,
    formState: { errors: err2 },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      language: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      brand_color: '#2563EB',
      notifications_enabled: true,
      late_checkin_alert: true,
      checkin_early_minutes: 30,
      geofence_radius_meters: 200,
      require_face_id: false,
      random_check_enabled: false,
    },
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const onFinalSubmit = () => {
    if (!step1Data || !step2Data) return;
    createTenant({
      name: step1Data.name,
      slug: step1Data.slug,
      logo_url: step1Data.logo_url || undefined,
      industry: step1Data.industry,
      settings: step2Data,
      plan: selectedPlan,
    });
  };

  // ── Render Step 1: Basic Info ─────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Thông tin công ty</Text>
      <Text style={styles.stepSubtitle}>
        Nhập thông tin cơ bản để thiết lập tài khoản FAMS của công ty bạn.
      </Text>

      {/* Company name */}
      <View style={styles.field}>
        <FieldLabel text="Tên công ty" required />
        <Controller
          control={ctrl1}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, err1.name && styles.inputError]}
              value={value}
              onChangeText={(text) => handleNameChange(text, onChange)}
              onBlur={onBlur}
              placeholder="Ví dụ: Công ty TNHH ABC"
              placeholderTextColor="#94A3B8"
              returnKeyType="next"
            />
          )}
        />
        <ErrorText message={err1.name?.message} />
      </View>

      {/* Slug / domain */}
      <View style={styles.field}>
        <FieldLabel text="Domain (URL)" required />
        <View style={styles.slugWrapper}>
          <Text style={styles.slugPrefix}>fams.vn/</Text>
          <Controller
            control={ctrl1}
            name="slug"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.slugInput, err1.slug && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="cong-ty-abc"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            )}
          />
        </View>
        <ErrorText message={err1.slug?.message} />
      </View>

      {/* Logo URL */}
      <View style={styles.field}>
        <FieldLabel text="Logo URL (tuỳ chọn)" />
        <Controller
          control={ctrl1}
          name="logo_url"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, err1.logo_url && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="https://example.com/logo.png"
              placeholderTextColor="#94A3B8"
              keyboardType="url"
              autoCapitalize="none"
              returnKeyType="next"
            />
          )}
        />
        <ErrorText message={err1.logo_url?.message} />
      </View>

      {/* Industry */}
      <View style={styles.field}>
        <FieldLabel text="Ngành nghề" required />
        <Controller
          control={ctrl1}
          name="industry"
          render={({ field: { value, onChange } }) => (
            <OptionPicker<TenantIndustry>
              value={value}
              onChange={onChange}
              options={(Object.entries(INDUSTRY_LABELS) as [TenantIndustry, string][]).map(
                ([v, label]) => ({ value: v, label }),
              )}
            />
          )}
        />
      </View>
    </View>
  );

  // ── Render Step 2: Settings ───────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Cài đặt hệ thống</Text>
      <Text style={styles.stepSubtitle}>
        Thiết lập múi giờ và các quy tắc chấm công đang được hệ thống hỗ trợ.
      </Text>

      {/* Timezone */}
      <View style={styles.field}>
        <FieldLabel text="Múi giờ" />
        <Controller
          control={ctrl2}
          name="timezone"
          render={({ field: { value, onChange } }) => (
            <OptionPicker<AppTimezone>
              value={value}
              onChange={onChange}
              options={(Object.entries(TIMEZONE_LABELS) as [AppTimezone, string][]).map(
                ([v, label]) => ({ value: v, label }),
              )}
            />
          )}
        />
      </View>

      {/* Toggles */}
      <View style={styles.switchGroup}>
        <Controller
          control={ctrl2}
          name="notifications_enabled"
          render={({ field: { value, onChange } }) => (
            <SwitchRow
              label="Thông báo trong ứng dụng"
              description="Hiển thị thông báo về chấm công, phân công và cập nhật"
              value={value}
              onChange={onChange}
            />
          )}
        />
        <Controller
          control={ctrl2}
          name="late_checkin_alert"
          render={({ field: { value, onChange } }) => (
            <SwitchRow
              label="Cảnh báo check-in trễ"
              description="Thông báo quản lý khi nhân viên check-in muộn"
              value={value}
              onChange={onChange}
            />
          )}
        />
      </View>

      {/* Numeric settings */}
      <View style={styles.numericRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <FieldLabel text="Cho phép check-in trước (phút)" />
          <Controller
            control={ctrl2}
            name="checkin_early_minutes"
            render={({ field: { value, onChange } }) => (
              <TextInput
                style={styles.input}
                value={String(value)}
                onChangeText={(t) => onChange(Number(t.replace(/\D/g, '')) || 0)}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor="#94A3B8"
              />
            )}
          />
          <ErrorText message={err2.checkin_early_minutes?.message} />
        </View>
        <View style={styles.numericSpacer} />
        <View style={[styles.field, { flex: 1 }]}>
          <FieldLabel text="Bán kính GPS (mét)" />
          <Controller
            control={ctrl2}
            name="geofence_radius_meters"
            render={({ field: { value, onChange } }) => (
              <TextInput
                style={styles.input}
                value={String(value)}
                onChangeText={(t) => onChange(Number(t.replace(/\D/g, '')) || 50)}
                keyboardType="number-pad"
                placeholder="200"
                placeholderTextColor="#94A3B8"
              />
            )}
          />
          <ErrorText message={err2.geofence_radius_meters?.message} />
        </View>
      </View>
    </View>
  );

  // ── Render Step 3: Review & Plan ──────────────────────────────────────────
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Xác nhận & Chọn gói</Text>
      <Text style={styles.stepSubtitle}>
        Kiểm tra lại thông tin và chọn gói phù hợp với quy mô công ty.
      </Text>

      {/* Review summary */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewTitleRow}>
          <Ionicons name="business-outline" size={19} color="#2563EB" />
          <Text style={styles.reviewSectionTitle}>Thông tin công ty</Text>
        </View>
        <ReviewRow label="Tên công ty" value={step1Data?.name ?? ''} />
        <ReviewRow label="Domain" value={`fams.vn/${step1Data?.slug ?? ''}`} />
        <ReviewRow label="Ngành nghề" value={INDUSTRY_LABELS[step1Data?.industry ?? 'other']} />
        <ReviewRow
          label="Múi giờ"
          value={TIMEZONE_LABELS[step2Data?.timezone ?? 'Asia/Ho_Chi_Minh']}
        />
      </View>

      {/* Plan selection */}
      <Text style={[styles.reviewSectionTitle, { marginTop: 20 }]}>💳 Chọn gói dịch vụ</Text>
      {DEFAULT_PLAN_DETAILS.map((plan) => {
        const isSelected = selectedPlan === plan.plan;
        const color = PLAN_COLORS[plan.plan];
        return (
          <TouchableOpacity
            key={plan.plan}
            style={[styles.planCard, isSelected && { borderColor: color, borderWidth: 2 }]}
            onPress={() => setSelectedPlan(plan.plan)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Gói ${plan.label}, ${formatPlanPrice(plan.price_vnd_per_month)}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color }]}>{plan.label}</Text>
                <Text style={styles.planPrice}>{formatPlanPrice(plan.price_vnd_per_month)}</Text>
              </View>
              {isSelected && (
                <View style={[styles.planCheck, { backgroundColor: color }]}>
                  <Text style={styles.planCheckText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.planLimits}>
              {formatEmployeeLimit(plan.employee_limit)} · {formatStorageLimit(plan.storage_limit_gb)}
            </Text>
            <View style={styles.planFeatures}>
              {plan.features.map((f) => (
                <Text key={f} style={styles.planFeatureItem}>• {f}</Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* API error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </View>
  );

  // ── Navigation footer ─────────────────────────────────────────────────────
  const renderFooter = () => (
    <View style={styles.footer}>
      {currentStep > 1 ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep((s) => Math.max(1, s - 1) as WizardStep)}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Text style={styles.backButtonText}>Huỷ</Text>
        </TouchableOpacity>
      )}

      {currentStep === 1 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={submit1(onStep1Submit)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Tiếp theo →</Text>
        </TouchableOpacity>
      )}
      {currentStep === 2 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={submit2(onStep2Submit)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Tiếp theo →</Text>
        </TouchableOpacity>
      )}
      {currentStep === 3 && (
        <TouchableOpacity
          style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
          onPress={onFinalSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Tạo công ty</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StepProgress current={currentStep} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer wide style={styles.responsiveContent}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ResponsiveContainer>
      </ScrollView>
      {renderFooter()}
    </View>
  );
}

// ── Review Row ─────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  responsiveContent: { width: '100%' },

  // ── Step progress ──
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 0,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepDoneText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    right: -8,
    width: 16,
    height: 1,
    backgroundColor: '#CBD5E1',
  },

  // ── Step content ──
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginTop: -12,
  },

  // ── Fields ──
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },

  // ── Slug field ──
  slugWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  slugPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: '#F1F5F9',
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  slugInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 0,
  },

  // ── Option picker ──
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#ffffff',
  },
  optionChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  optionChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  // ── Color picker ──
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#ffffff',
  },

  // ── Switches ──
  switchGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  switchLabelGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  switchDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },

  // ── Numeric row ──
  numericRow: {
    flexDirection: 'row',
  },
  numericSpacer: {
    width: 12,
  },

  // ── Review ──
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  reviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  reviewColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewColorDot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  // ── Plan cards ──
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
  },
  planPrice: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  planCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCheckText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  planLimits: {
    fontSize: 12,
    color: '#94A3B8',
  },
  planFeatures: {
    gap: 2,
  },
  planFeatureItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },

  // ── Error banner ──
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 20,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  backButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
