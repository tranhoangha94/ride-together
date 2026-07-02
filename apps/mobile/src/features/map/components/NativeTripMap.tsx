import { forwardRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { MapViewProps, PROVIDER_GOOGLE } from "react-native-maps";

type Props = MapViewProps & {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetNorth?: () => void;
  onCenterMe?: () => void;
};

export const NativeTripMap = forwardRef<MapView, Props>(function NativeTripMap(
  { style, children, onZoomIn, onZoomOut, onResetNorth, onCenterMe, ...props },
  ref
) {
  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled
        scrollEnabled
        zoomEnabled
        zoomTapEnabled
        pitchEnabled={false}
        scrollDuringRotateOrZoomEnabled
        toolbarEnabled={false}
        {...props}
      >
        {children}
      </MapView>

      <View style={styles.controls} pointerEvents="box-none">
        <Pressable
          style={styles.controlButton}
          onPress={onZoomIn}
          accessibilityRole="button"
          accessibilityLabel="Phóng to bản đồ"
          hitSlop={8}
        >
          <Text style={styles.controlText}>+</Text>
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={onZoomOut}
          accessibilityRole="button"
          accessibilityLabel="Thu nhỏ bản đồ"
          hitSlop={8}
        >
          <Text style={styles.controlText}>−</Text>
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={onResetNorth}
          accessibilityRole="button"
          accessibilityLabel="Đưa hướng bắc lên trên"
          hitSlop={8}
        >
          <View style={styles.compassGlyph}>
            <View style={styles.compassNeedleNorth} />
            <View style={styles.compassNeedleSouth} />
          </View>
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={onCenterMe}
          accessibilityRole="button"
          accessibilityLabel="Về vị trí của tôi"
          hitSlop={8}
        >
          <View style={styles.locateOuter}>
            <View style={styles.locateInner} />
          </View>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7F0EA"
  },
  controls: {
    position: "absolute",
    right: 16,
    bottom: 288,
    gap: 8
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  controlText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344054"
  },
  compassGlyph: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  compassNeedleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#D92D20"
  },
  compassNeedleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#98A2B3"
  },
  locateOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#1570EF",
    alignItems: "center",
    justifyContent: "center"
  },
  locateInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1570EF"
  }
});
