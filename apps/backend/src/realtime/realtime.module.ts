import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TripsModule } from "../trips/trips.module";
import { RealtimeGateway } from "./realtime.gateway";

@Module({
  imports: [AuthModule, TripsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway]
})
export class RealtimeModule {}
