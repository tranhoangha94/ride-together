import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { TripsService } from "../trips/trips.service";
import { Checkpoint } from "./checkpoint.entity";
import { CreateCheckpointDto } from "./dto";

@ApiTags("Checkpoints")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CheckpointsController {
  constructor(
    @InjectRepository(Checkpoint) private readonly checkpoints: Repository<Checkpoint>,
    private readonly trips: TripsService
  ) {}

  @Post("trips/:id/checkpoints")
  async create(@CurrentUser() user: AuthUser, @Param("id") tripId: string, @Body() dto: CreateCheckpointDto) {
    await this.trips.assertTripMember(tripId, user.id);
    const rows = await this.checkpoints.query(
      `
      INSERT INTO checkpoints (trip_id, name, description, point, lat, lng, radius_m, target_time, created_by)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $5, $4, $6, $7, $8)
      RETURNING *
      `,
      [tripId, dto.name, dto.description ?? null, dto.lng, dto.lat, dto.radiusM ?? 100, dto.targetTime ?? null, user.id]
    );
    return rows[0];
  }

  @Get("trips/:id/checkpoints")
  async list(@CurrentUser() user: AuthUser, @Param("id") tripId: string) {
    await this.trips.assertTripMember(tripId, user.id);
    return this.checkpoints.findBy({ tripId });
  }

  @Post("checkpoints/:id/reached")
  reached() {
    return { success: true };
  }
}
