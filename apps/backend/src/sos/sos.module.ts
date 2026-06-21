import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TripsModule } from "../trips/trips.module";
import { SosEvent } from "./sos-event.entity";
import { SosController } from "./sos.controller";
import { SosService } from "./sos.service";

@Module({
  imports: [TypeOrmModule.forFeature([SosEvent]), TripsModule],
  controllers: [SosController],
  providers: [SosService]
})
export class SosModule {}
