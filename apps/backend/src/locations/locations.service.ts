import { ForbiddenException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../redis/redis.service";
import { TripsService } from "../trips/trips.service";
import { LocationUpdateDto } from "./dto";
import { UserLocation } from "./user-location.entity";

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(UserLocation) private readonly locations: Repository<UserLocation>,
    private readonly trips: TripsService,
    private readonly redis: RedisService,
    private readonly config: ConfigService
  ) {}

  async update(userId: string, tripId: string, dto: LocationUpdateDto) {
    const { membership } = await this.trips.assertActiveTripMember(tripId, userId);
    if (!membership.shareLocationEnabled) {
      throw new ForbiddenException("Location sharing is disabled.");
    }

    const rateKey = `location_rate:${tripId}:${userId}`;
    const rateSet = await this.redis.client.set(rateKey, "1", "EX", this.config.get<number>("LOCATION_RATE_LIMIT_TTL_SECONDS", 3), "NX");
    if (!rateSet) throw new HttpException("Location update rate limited.", HttpStatus.TOO_MANY_REQUESTS);

    const payload = { tripId, userId, ...dto };
    await this.redis.client.set(
      this.redis.lastLocationKey(tripId, userId),
      JSON.stringify(payload),
      "EX",
      this.config.get<number>("LOCATION_UPDATE_TTL_SECONDS", 120)
    );

    await this.locations.query(
      `
      INSERT INTO user_locations (trip_id, user_id, point, lat, lng, speed, heading, accuracy, battery_level, recorded_at)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $4, $3, $5, $6, $7, $8, $9)
      ON CONFLICT (trip_id, user_id)
      DO UPDATE SET
        point = EXCLUDED.point,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        accuracy = EXCLUDED.accuracy,
        battery_level = EXCLUDED.battery_level,
        recorded_at = EXCLUDED.recorded_at,
        updated_at = now()
      `,
      [tripId, userId, dto.lng, dto.lat, dto.speed ?? null, dto.heading ?? null, dto.accuracy ?? null, dto.batteryLevel ?? null, dto.recordedAt]
    );

    return payload;
  }

  async latest(userId: string, tripId: string) {
    await this.trips.assertTripMember(tripId, userId);
    return this.locations.findBy({ tripId });
  }
}
