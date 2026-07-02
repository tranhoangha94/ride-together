import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export type MarkerMember = {
  userId: string;
  lat: number;
  lng: number;
  speed?: number;
  recordedAt?: string;
};

type Props = { members: MarkerMember[]; onSelectMember?: (member: MarkerMember) => void };

export function MemberBottomSheet({ members, onSelectMember }: Props) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Thành viên ({members.length})</Text>
      <FlatList
        data={members}
        horizontal
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.member, pressed && styles.memberPressed]}
            onPress={() => onSelectMember?.(item)}
            accessibilityRole="button"
            accessibilityLabel={`Xem vị trí của ${item.userId} trên bản đồ`}
          >
            <Text style={styles.name} numberOfLines={1}>
              {item.userId}
            </Text>
            <Text style={styles.speed}>{Math.round(item.speed ?? 0)} km/h</Text>
          </Pressable>
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
  listContent: { paddingRight: 96 },
  member: { minWidth: 108, maxWidth: 140, marginRight: 8, borderWidth: 1, borderColor: "#EAECF0", borderRadius: 8, padding: 8 },
  memberPressed: { backgroundColor: "#F2F4F7", borderColor: "#1570EF" },
  name: { fontWeight: "700", fontSize: 13 },
  speed: { color: "#667085", marginTop: 2, fontSize: 12 }
});
