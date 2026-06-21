import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../redis/redis.service";
import { CameraPoint } from "./camera-point.entity";
import { CameraReport } from "./camera-report.entity";
import { CreateCameraReportDto } from "./dto";

type SafetyPoint = {
  id: string;
  type: "traffic_signal" | "camera";
  cameraType?: string;
  lat: number;
  lng: number;
  title: string;
  description?: string | null;
  distanceM?: number;
  source: "osm" | "database";
};

@Injectable()
export class CameraPointsService {
  constructor(
    @InjectRepository(CameraPoint) private readonly points: Repository<CameraPoint>,
    @InjectRepository(CameraReport) private readonly reports: Repository<CameraReport>,
    private readonly redis: RedisService,
    private readonly config: ConfigService
  ) {}

  nearby(lat: number, lng: number, radius = 800) {
    return this.points.query(
      `
      SELECT *, ST_Distance(point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
      FROM camera_points
      WHERE status = 'active'
        AND ST_DWithin(point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance_m ASC
      LIMIT 100
      `,
      [lng, lat, radius]
    );
  }

  async safetyNearby(lat: number, lng: number, radius = 800): Promise<SafetyPoint[]> {
    const [cameraPoints, trafficSignals, osmSpeedCameras] = await Promise.all([
      this.nearby(lat, lng, radius),
      this.fetchTrafficSignalsFromOsm(lat, lng, radius),
      this.fetchSpeedCamerasFromOsm(lat, lng, radius)
    ]);

    const cameras: SafetyPoint[] = cameraPoints.map((point: Record<string, unknown>) => ({
      id: String(point.id),
      type: "camera",
      cameraType: String(point.type),
      lat: Number(point.lat),
      lng: Number(point.lng),
      title: String(point.title ?? "Traffic safety camera"),
      description: typeof point.description === "string" ? point.description : null,
      distanceM: Number(point.distance_m ?? 0),
      source: "database"
    }));

    return [...trafficSignals, ...osmSpeedCameras, ...cameras].sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  }

  private async fetchTrafficSignalsFromOsm(lat: number, lng: number, radius: number): Promise<SafetyPoint[]> {
    const cacheKey = `osm_traffic_signals:${Math.round(lat * 1000)}:${Math.round(lng * 1000)}:${Math.round(radius / 250)}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached) as SafetyPoint[];

    const query = `
      [out:json][timeout:6];
      (
        node["highway"="traffic_signals"](around:${Math.round(radius)},${lat},${lng});
        node["highway"="crossing"]["crossing"="traffic_signals"](around:${Math.round(radius)},${lat},${lng});
      );
      out body 80;
    `;
    const json = await this.queryOverpass(query);
    const signals = (json.elements ?? [])
      .filter((element) => typeof element.lat === "number" && typeof element.lon === "number")
      .map((element) => ({
        id: `osm-traffic-signal-${element.id}`,
        type: "traffic_signal" as const,
        lat: Number(element.lat),
        lng: Number(element.lon),
        title: element.tags?.name ?? "Traffic signal",
        description: "Traffic light location from OpenStreetMap",
        distanceM: this.haversineDistanceM(lat, lng, Number(element.lat), Number(element.lon)),
        source: "osm" as const
      }));
    await this.redis.client.set(cacheKey, JSON.stringify(signals), "EX", 600);
    return signals;
  }

  private async fetchSpeedCamerasFromOsm(lat: number, lng: number, radius: number): Promise<SafetyPoint[]> {
    const cacheKey = `osm_speed_cameras:${Math.round(lat * 1000)}:${Math.round(lng * 1000)}:${Math.round(radius / 250)}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached) as SafetyPoint[];

    const query = `
      [out:json][timeout:10];
      (
        node["highway"="speed_camera"](around:${Math.round(radius)},${lat},${lng});
        node["man_made"="speed_camera"](around:${Math.round(radius)},${lat},${lng});
        node["surveillance:type"="ALPR"](around:${Math.round(radius)},${lat},${lng});
        node["surveillance"="traffic"](around:${Math.round(radius)},${lat},${lng});
        node["enforcement"="maxspeed"](around:${Math.round(radius)},${lat},${lng});
        node["enforcement"="traffic_signals"](around:${Math.round(radius)},${lat},${lng});
      );
      (
        relation["type"="enforcement"](around:${Math.round(radius)},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;
    const json = await this.queryOverpass(query);
    const elements = json.elements ?? [];
    const nodesById = new Map<number, { lat: number; lon: number; tags?: Record<string, string> }>();
    for (const element of elements) {
      if (element.type === "node" && typeof element.lat === "number" && typeof element.lon === "number") {
        nodesById.set(element.id, { lat: element.lat, lon: element.lon, tags: element.tags });
      }
    }

    const cameras: SafetyPoint[] = [];
    const seen = new Set<string>();

    for (const element of elements) {
      if (element.type !== "node" || typeof element.lat !== "number" || typeof element.lon !== "number") continue;
      if (!this.isOsmCameraTag(element.tags)) continue;
      const id = `osm-camera-${element.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      cameras.push({
        id,
        type: "camera" as const,
        cameraType: element.tags?.highway === "speed_camera" || element.tags?.man_made === "speed_camera" ? "speed_camera" : "traffic_hazard",
        lat: Number(element.lat),
        lng: Number(element.lon),
        title: element.tags?.name ?? (element.tags?.enforcement === "traffic_signals" ? "Camera đèn đỏ" : "Camera tốc độ"),
        description: "Traffic camera location from OpenStreetMap",
        distanceM: this.haversineDistanceM(lat, lng, Number(element.lat), Number(element.lon)),
        source: "osm" as const
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
        cameras.push({
          id,
          type: "camera" as const,
          cameraType: enforcementType === "traffic_signals" ? "red_light" : "speed_camera",
          lat: node.lat,
          lng: node.lon,
          title: enforcementType === "traffic_signals" ? "Camera đèn đỏ" : "Camera tốc độ",
          description: `Enforcement point (${enforcementType}) from OpenStreetMap`,
          distanceM: this.haversineDistanceM(lat, lng, node.lat, node.lon),
          source: "osm" as const
        });
      }
    }
    await this.redis.client.set(cacheKey, JSON.stringify(cameras), "EX", 600);
    return cameras;
  }

  private async queryOverpass(query: string): Promise<{ elements?: Array<{ id: number; lat?: number; lon?: number; type?: string; tags?: Record<string, string>; members?: Array<{ type: string; ref: number; role: string }> }> }> {
    const endpoints = this.config
      .get<string>(
        "OVERPASS_API_URLS",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter,https://overpass.private.coffee/api/interpreter,https://overpass-api.de/api/interpreter"
      )
      .split(",")
      .map((endpoint) => endpoint.trim())
      .filter(Boolean);
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) continue;
        return (await response.json()) as { elements?: Array<{ id: number; lat?: number; lon?: number; type?: string; tags?: Record<string, string>; members?: Array<{ type: string; ref: number; role: string }> }> };
      } catch {
        continue;
      }
    }

    return { elements: [] };
  }

  private isOsmCameraTag(tags?: Record<string, string>) {
    return (
      tags?.highway === "speed_camera" ||
      tags?.man_made === "speed_camera" ||
      tags?.["surveillance:type"] === "ALPR" ||
      tags?.surveillance === "traffic" ||
      tags?.enforcement === "maxspeed" ||
      tags?.enforcement === "traffic_signals"
    );
  }

  private haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusM = 6_371_000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  createReport(userId: string, dto: CreateCameraReportDto) {
    return this.reports.query(
      `
      INSERT INTO camera_reports (reporter_id, type, point, lat, lng, title, description)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $4, $3, $5, $6)
      RETURNING *
      `,
      [userId, dto.type, dto.lng, dto.lat, dto.title, dto.description ?? null]
    );
  }

  reportsByStatus(status = "pending") {
    return this.reports.find({ where: { status: status as CameraReport["status"] }, order: { id: "DESC" } });
  }

  async approve(userId: string, reportId: string) {
    const report = await this.reports.findOneBy({ id: reportId });
    if (!report) throw new NotFoundException("Report not found.");
    const rows = await this.points.query(
      `
      INSERT INTO camera_points (type, point, lat, lng, title, description, source)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $3, $2, $4, $5, 'user_report')
      RETURNING *
      `,
      [report.type, report.lng, report.lat, report.title, report.description ?? null]
    );
    report.status = "approved";
    report.reviewedBy = userId;
    report.reviewedAt = new Date();
    await this.reports.save(report);
    return { cameraPoint: rows[0], report };
  }

  async reject(userId: string, reportId: string) {
    const report = await this.reports.findOneBy({ id: reportId });
    if (!report) throw new NotFoundException("Report not found.");
    report.status = "rejected";
    report.reviewedBy = userId;
    report.reviewedAt = new Date();
    return this.reports.save(report);
  }
}
