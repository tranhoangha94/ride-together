import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateTeamDto, JoinTeamDto } from "./dto";
import { TeamsService } from "./teams.service";

@ApiTags("Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.teams.list(user.id);
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.teams.detail(user.id, id);
  }

  @Post(":id/invite")
  invite(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.teams.invite(user.id, id);
  }

  @Post("join")
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinTeamDto) {
    return this.teams.join(user.id, dto);
  }

  @Delete(":id/leave")
  leave(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.teams.leave(user.id, id);
  }
}
