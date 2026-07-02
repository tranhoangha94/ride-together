import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafetyPoint } from "../utils/safetyPoints";
import { CameraGlyph, TrafficLightGlyph } from "./SafetyIcons";

type Props = {
  visible: boolean;
  points: SafetyPoint[];
  onClose: () => void;
  onSelectPoint: (point: SafetyPoint) => void;
};

export function SafetyPointList({ visible, points, onClose, onSelectPoint }: Props) {
  if (!visible) return null;

  const sorted = [...points].sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Đóng danh sách" />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Điểm an toàn gần đây ({sorted.length})</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={8}>
            <Text style={styles.closeText}>Đóng</Text>
          </Pressable>
        </View>
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelectPoint(item)}
              accessibilityRole="button"
              accessibilityLabel={`Xem ${item.title} trên bản đồ`}
            >
              <View style={styles.rowIcon}>
                {item.type === "camera" ? <CameraGlyph size={18} /> : <TrafficLightGlyph size={18} />}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={styles.rowDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {typeof item.distanceM === "number" ? (
                <Text style={styles.rowDistance}>
                  {item.distanceM >= 1000 ? `${(item.distanceM / 1000).toFixed(1)}km` : `${Math.round(item.distanceM)}m`}
                </Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có điểm nào trong khu vực này.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(16,24,40,0.4)",
    justifyContent: "flex-end"
  },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    paddingBottom: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0"
  },
  title: { fontSize: 16, fontWeight: "700", color: "#101828" },
  closeText: { fontSize: 14, fontWeight: "700", color: "#1570EF" },
  separator: { height: 1, backgroundColor: "#F2F4F7" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  rowPressed: { backgroundColor: "#F9FAFB" },
  rowIcon: { width: 28, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#101828" },
  rowDescription: { fontSize: 12, color: "#667085", marginTop: 2 },
  rowDistance: { fontSize: 12, fontWeight: "600", color: "#475467" },
  empty: { textAlign: "center", color: "#98A2B3", padding: 24 }
});
