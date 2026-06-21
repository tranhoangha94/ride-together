import { Module } from "@nestjs/common";
import { CameraPointsModule } from "../camera-points/camera-points.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [CameraPointsModule],
  controllers: [AdminController]
})
export class AdminModule {}
