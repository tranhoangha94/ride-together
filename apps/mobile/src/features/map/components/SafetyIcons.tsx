import { StyleSheet, View } from "react-native";

type GlyphProps = { size?: number };

export function TrafficLightGlyph({ size = 16 }: GlyphProps) {
  const bulbSize = Math.round(size * 0.34);
  return (
    <View style={[styles.signalBody, { width: size * 0.6, height: size, borderRadius: size * 0.15 }]}>
      <View style={[styles.bulb, { width: bulbSize, height: bulbSize, borderRadius: bulbSize / 2, backgroundColor: "#F04438" }]} />
      <View style={[styles.bulb, { width: bulbSize, height: bulbSize, borderRadius: bulbSize / 2, backgroundColor: "#FDB022" }]} />
      <View style={[styles.bulb, { width: bulbSize, height: bulbSize, borderRadius: bulbSize / 2, backgroundColor: "#12B76A" }]} />
    </View>
  );
}

export function CameraGlyph({ size = 16 }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={[styles.cameraBody, { width: size, height: size * 0.68, borderRadius: size * 0.14 }]} />
      <View style={[styles.cameraBump, { width: size * 0.3, height: size * 0.16 }]} />
      <View style={[styles.cameraLens, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  signalBody: {
    backgroundColor: "#1D2939",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 2
  },
  bulb: {},
  cameraBody: {
    backgroundColor: "#1D2939",
    position: "absolute",
    bottom: 0
  },
  cameraBump: {
    backgroundColor: "#1D2939",
    position: "absolute",
    top: 0,
    left: "18%",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2
  },
  cameraLens: {
    backgroundColor: "#98A2B3",
    position: "absolute",
    alignSelf: "center"
  }
});
