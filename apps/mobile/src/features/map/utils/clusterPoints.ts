import { SafetyPoint } from "./safetyPoints";

export type SafetyCluster = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  cameraCount: number;
  signalCount: number;
};

export type SafetyMapItem = { kind: "point"; point: SafetyPoint } | { kind: "cluster"; cluster: SafetyCluster };

export function zoomBucketFromDelta(delta: number): number {
  const clamped = Math.max(delta, 0.0005);
  return Math.round(Math.log2(360 / clamped));
}

export function deltaFromZoomBucket(bucket: number): number {
  return 360 / Math.pow(2, bucket);
}

/**
 * Grid-based clustering: cell size scales with the visible region span, so it
 * stays stable while panning and only changes when the zoom level changes.
 */
export function clusterSafetyPoints(points: SafetyPoint[], regionDelta: number): SafetyMapItem[] {
  if (points.length === 0) return [];

  const cellSize = Math.max(regionDelta / 12, 0.0002);
  const cells = new Map<string, SafetyPoint[]>();

  for (const point of points) {
    const key = `${Math.floor(point.lng / cellSize)}:${Math.floor(point.lat / cellSize)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(point);
    else cells.set(key, [point]);
  }

  const items: SafetyMapItem[] = [];
  for (const [key, bucket] of cells) {
    if (bucket.length === 1) {
      items.push({ kind: "point", point: bucket[0] });
      continue;
    }
    let latSum = 0;
    let lngSum = 0;
    let cameraCount = 0;
    for (const point of bucket) {
      latSum += point.lat;
      lngSum += point.lng;
      if (point.type === "camera") cameraCount += 1;
    }
    items.push({
      kind: "cluster",
      cluster: {
        id: `cluster-${key}`,
        lat: latSum / bucket.length,
        lng: lngSum / bucket.length,
        count: bucket.length,
        cameraCount,
        signalCount: bucket.length - cameraCount
      }
    });
  }
  return items;
}
