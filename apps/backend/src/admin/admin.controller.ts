import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { AdminGuard } from "../common/guards/admin.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CameraPointsService } from "../camera-points/camera-points.service";

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly camera: CameraPointsService) {}

  @Get("camera-reports")
  reports(@Query("status") status?: string) {
    return this.camera.reportsByStatus(status);
  }

  @Patch("camera-reports/:id/approve")
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.camera.approve(user.id, id);
  }

  @Patch("camera-reports/:id/reject")
  reject(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.camera.reject(user.id, id);
  }
}
