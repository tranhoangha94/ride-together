export type SafetyPoint = {
  id: string;
  type: "traffic_signal" | "camera";
  lat: number;
  lng: number;
  title: string;
  description?: string | null;
  distanceM?: number;
};

const OVERPASS_ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

export function buildOverpassSafetyQuery(lat: number, lng: number, radius: number) {
  const r = Math.round(radius);
  return `
    [out:json][timeout:10];
    (
      node["highway"="traffic_signals"](around:${r},${lat},${lng});
      node["highway"="crossing"]["crossing"="traffic_signals"](around:${r},${lat},${lng});
      node["highway"="speed_camera"](around:${r},${lat},${lng});
      node["man_made"="speed_camera"](around:${r},${lat},${lng});
      node["surveillance:type"="ALPR"](around:${r},${lat},${lng});
      node["surveillance"="traffic"](around:${r},${lat},${lng});
      node["enforcement"="maxspeed"](around:${r},${lat},${lng});
      node["enforcement"="traffic_signals"](around:${r},${lat},${lng});
    );
    (
      relation["type"="enforcement"](around:${r},${lat},${lng});
    );
    out body;
    >;
    out skel qt;
  `;
}

function isOsmCamera(tags?: Record<string, string>) {
  return (
    tags?.highway === "speed_camera" ||
    tags?.man_made === "speed_camera" ||
    tags?.["surveillance:type"] === "ALPR" ||
    tags?.surveillance === "traffic" ||
    tags?.enforcement === "maxspeed" ||
    tags?.enforcement === "traffic_signals"
  );
}

function isOsmTrafficSignal(tags?: Record<string, string>) {
  return tags?.highway === "traffic_signals" || (tags?.highway === "crossing" && tags?.crossing === "traffic_signals");
}

function parseOverpassElements(
  elements: Array<{ id: number; lat?: number; lon?: number; tags?: Record<string, string>; type?: string; role?: string; members?: Array<{ type: string; ref: number; role: string }> }>
): SafetyPoint[] {
  const nodesById = new Map<number, { lat: number; lon: number; tags?: Record<string, string> }>();
  const points: SafetyPoint[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    if (element.type === "node" && typeof element.lat === "number" && typeof element.lon === "number") {
      nodesById.set(element.id, { lat: element.lat, lon: element.lon, tags: element.tags });
    }
  }

  for (const element of elements) {
    if (element.type !== "node" || typeof element.lat !== "number" || typeof element.lon !== "number") continue;
    const tags = element.tags ?? {};
    const camera = isOsmCamera(tags);
    const signal = !camera && isOsmTrafficSignal(tags);
    if (!camera && !signal) continue;

    const id = camera ? `osm-camera-${element.id}` : `osm-traffic-signal-${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    points.push({
      id,
      type: camera ? "camera" : "traffic_signal",
      lat: element.lat,
      lng: element.lon,
      title: tags.name ?? (camera ? "Camera giao thông" : "Đèn giao thông"),
      description: camera ? "Vị trí camera từ OpenStreetMap" : "Vị trí đèn tín hiệu từ OpenStreetMap"
    });
  }

  for (const element of elements) {
    if (element.type !== "relation" || element.tags?.type !== "enforcement") continue;
    const enforcementType = element.tags.enforcement ?? "maxspeed";
    for (const member of element.members ?? []) {
      if (member.role !== "device" || member.type !== "node") continue;
      const node = nodesById.get(member.ref);
      if (!node) continue;
      const id = `osm-enforcement-${element.id}-${member.ref}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const isRedLight = enforcementType === "traffic_signals";
      points.push({
        id,
        type: isRedLight ? "traffic_signal" : "camera",
        lat: node.lat,
        lng: node.lon,
        title: isRedLight ? "Camera đèn đỏ" : "Camera tốc độ",
        description: `Điểm giám sát (${enforcementType}) từ OpenStreetMap`
      });
    }
  }

  return points;
}

export async function fetchSafetyPointsFromOverpass(lat: number, lng: number, radius: number): Promise<SafetyPoint[]> {
  const query = buildOverpassSafetyQuery(lat, lng, radius);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString()
      });
      if (!response.ok) continue;
      const json = (await response.json()) as { elements?: Array<{ id: number; lat?: number; lon?: number; tags?: Record<string, string>; type?: string; role?: string; members?: Array<{ type: string; ref: number; role: string }> }> };
      return parseOverpassElements(json.elements ?? []);
    } catch {
      continue;
    }
  }

  return [];
}
