import { StyleSheet, Text, Button } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLogout } from "@/features/auth/hooks/use-logout";

export default function HomeScreen() {
  const { logout, isPending } = useLogout();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text>Home Screen</Text>
      <Button
        title={isPending ? "Đang đăng xuất..." : "Đăng xuất"}
        onPress={() => logout()}
        disabled={isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
