import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TripsModule } from "../trips/trips.module";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import { UserLocation } from "./user-location.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserLocation]), TripsModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService]
})
export class LocationsModule {}
