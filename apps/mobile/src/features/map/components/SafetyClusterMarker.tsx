import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { SafetyCluster } from "../utils/clusterPoints";

type Props = { cluster: SafetyCluster; onPress: (cluster: SafetyCluster) => void };

function SafetyClusterMarkerBase({ cluster, onPress }: Props) {
  const dominant = cluster.cameraCount >= cluster.signalCount ? "#D92D20" : "#DC6803";
  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      tracksViewChanges={false}
      onPress={() => onPress(cluster)}
    >
      <View style={[styles.bubble, { borderColor: dominant }]}>
        <Text style={styles.text}>{cluster.count}</Text>
      </View>
    </Marker>
  );
}

export const SafetyClusterMarker = memo(
  SafetyClusterMarkerBase,
  (prev, next) =>
    prev.cluster.id === next.cluster.id &&
    prev.cluster.count === next.cluster.count &&
    prev.cluster.lat === next.cluster.lat &&
    prev.cluster.lng === next.cluster.lng
);

const styles = StyleSheet.create({
  bubble: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: "#FFF",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  text: { fontSize: 12, fontWeight: "700", color: "#344054" }
});
