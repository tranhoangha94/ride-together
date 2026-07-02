import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { SafetyPoint } from "../utils/safetyPoints";
import { CameraGlyph, TrafficLightGlyph } from "./SafetyIcons";

type Props = { point: SafetyPoint };

function SafetyPointMarkerBase({ point }: Props) {
  const isCamera = point.type === "camera";
  return (
    <Marker
      coordinate={{ latitude: point.lat, longitude: point.lng }}
      title={point.title}
      description={point.description ?? undefined}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.bubble, { borderColor: isCamera ? "#D92D20" : "#DC6803" }]}>
        {isCamera ? <CameraGlyph size={14} /> : <TrafficLightGlyph size={14} />}
      </View>
    </Marker>
  );
}

export const SafetyPointMarker = memo(
  SafetyPointMarkerBase,
  (prev, next) =>
    prev.point.id === next.point.id &&
    prev.point.lat === next.point.lat &&
    prev.point.lng === next.point.lng &&
    prev.point.type === next.point.type
);

const styles = StyleSheet.create({
  bubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFF",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  }
});
