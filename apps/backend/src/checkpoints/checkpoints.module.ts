import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TripsModule } from "../trips/trips.module";
import { Checkpoint } from "./checkpoint.entity";
import { CheckpointsController } from "./checkpoints.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Checkpoint]), TripsModule],
  controllers: [CheckpointsController]
})
export class CheckpointsModule {}
