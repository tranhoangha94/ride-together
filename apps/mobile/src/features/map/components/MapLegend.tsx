import { StyleSheet, Text, View } from "react-native";

export function MapLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.row}>
        <View style={[styles.dot, styles.leader]} />
        <Text style={styles.label}>Trưởng đoàn</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.dot, styles.member]} />
        <Text style={styles.label}>Thành viên</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.dot, styles.signal]} />
        <Text style={styles.label}>Đèn giao thông</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.dot, styles.camera]} />
        <Text style={styles.label}>Camera</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    position: "absolute",
    left: 16,
    top: 112,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  leader: { backgroundColor: "#1570EF" },
  member: { backgroundColor: "#12B76A" },
  signal: { backgroundColor: "#DC6803" },
  camera: { backgroundColor: "#D92D20" },
  label: { fontSize: 11, fontWeight: "600", color: "#344054" }
});
