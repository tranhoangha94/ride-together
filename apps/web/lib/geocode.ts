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

// OSRM public demo server - free, no API key. "driving" is the closest
// available profile to a motorbike (OSRM's public instance has no
// motorcycle profile).
export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometry=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const coords: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}
