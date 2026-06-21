import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../redis/redis.service";
import { TripsService } from "../trips/trips.service";
import { CreateSosDto } from "./dto";
import { SosEvent } from "./sos-event.entity";

@Injectable()
export class SosService {
  constructor(
    @InjectRepository(SosEvent) private readonly events: Repository<SosEvent>,
    private readonly trips: TripsService,
    private readonly redis: RedisService
  ) {}

  async create(userId: string, tripId: string, dto: CreateSosDto) {
    await this.trips.assertActiveTripMember(tripId, userId);
    const rows = await this.events.query(
      `
      INSERT INTO sos_events (trip_id, user_id, point, lat, lng, message)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $4, $3, $5)
      RETURNING *
      `,
      [tripId, userId, dto.lng, dto.lat, dto.message ?? null]
    );
    const event = rows[0];
    await this.redis.client.hset(this.redis.activeSosKey(tripId), event.id, JSON.stringify(event));
    return event;
  }

  async resolve(userId: string, sosId: string) {
    const event = await this.events.findOneBy({ id: sosId });
    if (!event) throw new NotFoundException("SOS not found.");
    await this.trips.assertTripMember(event.tripId, userId);
    event.status = "resolved";
    event.resolvedBy = userId;
    event.resolvedAt = new Date();
    await this.events.save(event);
    await this.redis.client.hdel(this.redis.activeSosKey(event.tripId), event.id);
    return event;
  }

  async active(userId: string, tripId: string) {
    await this.trips.assertTripMember(tripId, userId);
    return this.events.findBy({ tripId, status: "active" });
  }
}
