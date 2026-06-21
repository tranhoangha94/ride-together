import { Pressable, StyleSheet, Text } from "react-native";

export function SOSButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 18,
    bottom: 168,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D92D20",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5
  },
  text: { color: "#FFF", fontSize: 18, fontWeight: "800" }
});
