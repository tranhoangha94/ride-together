import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeamMember } from "../teams/team-member.entity";
import { TeamsModule } from "../teams/teams.module";
import { TripMember } from "../trip-members/trip-member.entity";
import { User } from "../users/user.entity";
import { Trip } from "./trip.entity";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";

@Module({
  imports: [TypeOrmModule.forFeature([Trip, TripMember, TeamMember, User]), TeamsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService, TypeOrmModule]
})
export class TripsModule {}
