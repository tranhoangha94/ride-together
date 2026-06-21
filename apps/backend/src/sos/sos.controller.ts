import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateSosDto } from "./dto";
import { SosService } from "./sos.service";

@ApiTags("SOS")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SosController {
  constructor(private readonly sos: SosService) {}

  @Post("trips/:id/sos")
  create(@CurrentUser() user: AuthUser, @Param("id") tripId: string, @Body() dto: CreateSosDto) {
    return this.sos.create(user.id, tripId, dto);
  }

  @Patch("sos/:id/resolve")
  resolve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.sos.resolve(user.id, id);
  }

  @Get("trips/:id/sos/active")
  active(@CurrentUser() user: AuthUser, @Param("id") tripId: string) {
    return this.sos.active(user.id, tripId);
  }
}
