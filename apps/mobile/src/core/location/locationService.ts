import * as Location from "expo-location";

export async function requestTripLocationPermission() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  return foreground.status === "granted";
}

export async function getCurrentTripLocation() {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });
}

export function watchTripLocation(onLocation: (location: Location.LocationObject) => void) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10
    },
    onLocation
  );
}
