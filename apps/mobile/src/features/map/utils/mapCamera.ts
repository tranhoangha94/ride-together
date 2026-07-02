import { RefObject } from "react";
import MapView, { Region } from "react-native-maps";

export async function resetMapNorth(mapRef: RefObject<MapView | null>) {
  const map = mapRef.current;
  if (!map) return;
  const camera = await map.getCamera();
  await map.animateCamera({ ...camera, heading: 0, pitch: 0 }, { duration: 250 });
}

// ~17 keeps roughly a 400m-wide view on screen, close enough to make out streets
// without feeling like a whole-city overview.
const FOCUS_ZOOM = 17;
const FOCUS_DELTA = 0.0036;

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
        zoom: Math.max(FOCUS_ZOOM, typeof camera.zoom === "number" ? camera.zoom : FOCUS_ZOOM)
      },
      { duration: 300 }
    );
    return;
  } catch {
    await map.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: FOCUS_DELTA,
        longitudeDelta: FOCUS_DELTA
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
