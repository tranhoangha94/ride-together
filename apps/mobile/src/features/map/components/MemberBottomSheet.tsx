import { FlatList, StyleSheet, Text, View } from "react-native";

export type MarkerMember = {
  userId: string;
  lat: number;
  lng: number;
  speed?: number;
  recordedAt?: string;
};

export function MemberBottomSheet({ members }: { members: MarkerMember[] }) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Thành viên ({members.length})</Text>
      <FlatList
        data={members}
        horizontal
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <View style={styles.member}>
            <Text style={styles.name} numberOfLines={1}>
              {item.userId}
            </Text>
            <Text style={styles.speed}>{Math.round(item.speed ?? 0)} km/h</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 24,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  member: { minWidth: 108, maxWidth: 140, marginRight: 8, borderWidth: 1, borderColor: "#EAECF0", borderRadius: 8, padding: 8 },
  name: { fontWeight: "700", fontSize: 13 },
  speed: { color: "#667085", marginTop: 2, fontSize: 12 }
});
