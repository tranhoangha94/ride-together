import { RefObject } from "react";
import MapView, { Region } from "react-native-maps";

export async function resetMapNorth(mapRef: RefObject<MapView | null>) {
  const map = mapRef.current;
  if (!map) return;
  const camera = await map.getCamera();
  await map.animateCamera({ ...camera, heading: 0, pitch: 0 }, { duration: 250 });
}

export async function centerMapOn(mapRef: RefObject<MapView | null>, latitude: number, longitude: number) {
  const map = mapRef.current;
  if (!map) return;

  try {
    const camera = await map.getCamera();
    await map.animateCamera(
      {
        center: { latitude, longitude },
        heading: camera.heading ?? 0,
        pitch: 0,
        zoom: typeof camera.zoom === "number" ? camera.zoom : 15
      },
      { duration: 300 }
    );
    return;
  } catch {
    await map.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      },
      300
    );
  }
}

export async function adjustMapZoom(mapRef: RefObject<MapView | null>, lastRegion: Region | null, delta: number) {
  const map = mapRef.current;
  if (!map) return;

  try {
    const camera = await map.getCamera();
    if (typeof camera.zoom === "number") {
      await map.animateCamera({ ...camera, zoom: Math.max(3, Math.min(20, camera.zoom + delta)) }, { duration: 180 });
      return;
    }
  } catch {
    // Use region fallback below.
  }

  if (!lastRegion) return;
  const factor = delta > 0 ? 0.65 : 1.45;
  await map.animateToRegion(
    {
      latitude: lastRegion.latitude,
      longitude: lastRegion.longitude,
      latitudeDelta: Math.max(0.002, Math.min(1.2, lastRegion.latitudeDelta * factor)),
      longitudeDelta: Math.max(0.002, Math.min(1.2, lastRegion.longitudeDelta * factor))
    },
    180
  );
}
