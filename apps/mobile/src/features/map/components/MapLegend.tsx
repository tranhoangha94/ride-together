import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraGlyph, TrafficLightGlyph } from "./SafetyIcons";

type Props = {
  showSignals: boolean;
  showCameras: boolean;
  onToggleSignals: () => void;
  onToggleCameras: () => void;
};

export function MapLegend({ showSignals, showCameras, onToggleSignals, onToggleCameras }: Props) {
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
      <Pressable
        style={styles.row}
        onPress={onToggleSignals}
        accessibilityRole="button"
        accessibilityLabel={showSignals ? "Ẩn đèn giao thông trên bản đồ" : "Hiện đèn giao thông trên bản đồ"}
      >
        <View style={[styles.iconSwatch, !showSignals && styles.iconSwatchOff]}>
          <TrafficLightGlyph size={13} />
        </View>
        <Text style={[styles.label, !showSignals && styles.labelOff]}>Đèn giao thông</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={onToggleCameras}
        accessibilityRole="button"
        accessibilityLabel={showCameras ? "Ẩn camera trên bản đồ" : "Hiện camera trên bản đồ"}
      >
        <View style={[styles.iconSwatch, !showCameras && styles.iconSwatchOff]}>
          <CameraGlyph size={13} />
        </View>
        <Text style={[styles.label, !showCameras && styles.labelOff]}>Camera</Text>
      </Pressable>
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
  iconSwatch: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  iconSwatchOff: { opacity: 0.35 },
  label: { fontSize: 11, fontWeight: "600", color: "#344054" },
  labelOff: { color: "#98A2B3", textDecorationLine: "line-through" }
});
