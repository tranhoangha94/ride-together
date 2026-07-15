export type PlaceResult = { label: string; lat: number; lng: number };

// OpenStreetMap Nominatim - free, no API key. Usage policy caps this at
// ~1 request/second; callers must debounce (the search box does, ~500ms).
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&q=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const json = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return json.map((item) => ({ label: item.display_name, lat: Number(item.lat), lng: Number(item.lon) }));
}

export type RouteStep = {
  instruction: string;
  distanceM: number;
  location: { lat: number; lng: number };
};

export type RouteResult = {
  coordinates: [number, number][];
  steps: RouteStep[];
  totalDistanceM: number;
  totalDurationS: number;
};

const MANEUVER_MODIFIER_TEXT: Record<string, string> = {
  left: "Rẽ trái",
  right: "Rẽ phải",
  "slight left": "Rẽ nhẹ sang trái",
  "slight right": "Rẽ nhẹ sang phải",
  "sharp left": "Rẽ gắt sang trái",
  "sharp right": "Rẽ gắt sang phải",
  straight: "Đi thẳng",
  uturn: "Quay đầu"
};

function maneuverInstruction(maneuver: { type: string; modifier?: string }, streetName: string): string {
  const street = streetName ? ` vào ${streetName}` : "";
  if (maneuver.type === "depart") return `Xuất phát${street}`;
  if (maneuver.type === "arrive") return "Bạn đã đến nơi";
  if (maneuver.type === "roundabout" || maneuver.type === "rotary") return `Đi vào vòng xuyến${street}`;
  const modifierText = MANEUVER_MODIFIER_TEXT[maneuver.modifier ?? "straight"] ?? "Đi thẳng";
  return `${modifierText}${street}`;
}

// OSRM public demo server - free, no API key. "driving" is the closest
// available profile to a motorbike (OSRM's public instance has no
// motorcycle profile).
export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const route = json?.routes?.[0];
    const coords: [number, number][] | undefined = route?.geometry?.coordinates;
    if (!coords) return null;

    const rawSteps: Array<{
      distance: number;
      name: string;
      maneuver: { type: string; modifier?: string; location: [number, number] };
    }> = route?.legs?.[0]?.steps ?? [];

    const steps: RouteStep[] = rawSteps.map((step) => ({
      instruction: maneuverInstruction(step.maneuver, step.name),
      distanceM: step.distance,
      location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] }
    }));

    return {
      coordinates: coords.map(([lng, lat]) => [lat, lng]),
      steps,
      totalDistanceM: route.distance ?? 0,
      totalDurationS: route.duration ?? 0
    };
  } catch {
    return null;
  }
}
