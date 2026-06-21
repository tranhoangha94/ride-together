import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CameraPointsService } from "./camera-points.service";
import { CreateCameraReportDto } from "./dto";

@ApiTags("Camera Points")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CameraPointsController {
  constructor(private readonly camera: CameraPointsService) {}

  @Get("camera-points/nearby")
  nearby(@Query("lat") lat: string, @Query("lng") lng: string, @Query("radius") radius?: string) {
    return this.camera.nearby(Number(lat), Number(lng), radius ? Number(radius) : undefined);
  }

  @Get("safety-points/nearby")
  safetyNearby(@Query("lat") lat: string, @Query("lng") lng: string, @Query("radius") radius?: string) {
    return this.camera.safetyNearby(Number(lat), Number(lng), radius ? Number(radius) : undefined);
  }

  @Post("camera-reports")
  report(@CurrentUser() user: AuthUser, @Body() dto: CreateCameraReportDto) {
    return this.camera.createReport(user.id, dto);
  }
}
