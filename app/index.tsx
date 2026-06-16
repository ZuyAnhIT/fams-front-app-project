import { router } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
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
          padding: 24,
          borderRadius: 20,
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", textAlign: "center" }}>
          FAMS
        </Text>

        <Text style={{ fontSize: 16, color: "#64748B", textAlign: "center" }}>
          Employee Attendance App
        </Text>

        <TextInput
          placeholder="Email hoặc số điện thoại"
          style={{
            borderWidth: 1,
            borderColor: "#CBD5E1",
            borderRadius: 12,
            padding: 14,
          }}
        />

        <TextInput
          placeholder="Mật khẩu"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: "#CBD5E1",
            borderRadius: 12,
            padding: 14,
          }}
        />

        <TouchableOpacity
          onPress={() => router.replace("/home")}
          style={{
            backgroundColor: "#2563EB",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}