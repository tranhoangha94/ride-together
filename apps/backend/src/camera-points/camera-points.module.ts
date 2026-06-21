import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CameraPoint } from "./camera-point.entity";
import { CameraReport } from "./camera-report.entity";
import { CameraPointsController } from "./camera-points.controller";
import { CameraPointsService } from "./camera-points.service";

@Module({
  imports: [TypeOrmModule.forFeature([CameraPoint, CameraReport])],
  controllers: [CameraPointsController],
  providers: [CameraPointsService],
  exports: [CameraPointsService]
})
export class CameraPointsModule {}
