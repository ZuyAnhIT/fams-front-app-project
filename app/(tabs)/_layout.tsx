import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: "Trang chủ" }} />
      <Tabs.Screen name="checkin" options={{ title: "Chấm công" }} />
      <Tabs.Screen name="random-check" options={{ title: "Kiểm tra" }} />
      <Tabs.Screen name="attendance" options={{ title: "Công" }} />
      <Tabs.Screen name="profile" options={{ title: "Hồ sơ" }} />
    </Tabs>
  );
}