import { Button, Text, TouchableOpacity, View } from "react-native";
import { useLogout } from '@/features/auth/hooks/use-logout';
export default function CheckinScreen() {
  const { logout, isPending } = useLogout();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: 24,
          alignItems: "center",
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Chấm công</Text>

        <Text style={{ color: "#64748B", textAlign: "center" }}>
          Kiểm tra GPS và Face ID trước khi check-in.
        </Text>

        <TouchableOpacity
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "#2563EB",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>
            CHECK IN
          </Text>
        </TouchableOpacity>

        <Text>GPS: Trong vùng hợp lệ</Text>
        <Text>Face ID: Chưa xác minh</Text>
        <Button
        title={isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
        onPress={() => logout()}
        disabled={isPending}
      />
      </View>
    </View>
  );
}
