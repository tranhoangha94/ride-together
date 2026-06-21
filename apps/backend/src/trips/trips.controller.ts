import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateTripDto, JoinTripDto, SetShareLocationDto } from "./dto";
import { TripsService } from "./trips.service";

@ApiTags("Trips")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("trips")
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("teamId") teamId?: string, @Query("status") status?: string) {
    return this.trips.list(user.id, teamId, status);
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.trips.detail(user.id, id);
  }

  @Patch(":id/start")
  start(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.trips.start(user.id, id);
  }

  @Patch(":id/end")
  end(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.trips.end(user.id, id);
  }

  @Post(":id/join")
  join(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: JoinTripDto) {
    return this.trips.join(user.id, id, dto);
  }

  @Delete(":id/leave")
  leave(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.trips.leave(user.id, id);
  }

  @Get(":id/members")
  members(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.trips.membersOf(user.id, id);
  }

  @Patch(":id/share-location")
  setShareLocation(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: SetShareLocationDto) {
    return this.trips.setShareLocation(user.id, id, dto.enabled);
  }
}
