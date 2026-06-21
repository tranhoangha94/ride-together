import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { LocationUpdateDto } from "./dto";
import { LocationsService } from "./locations.service";

@ApiTags("Locations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("trips/:id")
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Post("location")
  update(@CurrentUser() user: AuthUser, @Param("id") tripId: string, @Body() dto: LocationUpdateDto) {
    return this.locations.update(user.id, tripId, dto);
  }

  @Get("locations/latest")
  latest(@CurrentUser() user: AuthUser, @Param("id") tripId: string) {
    return this.locations.latest(user.id, tripId);
  }
}
