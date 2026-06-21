import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "./admin/admin.module";
import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { CameraPointsModule } from "./camera-points/camera-points.module";
import { CheckpointsModule } from "./checkpoints/checkpoints.module";
import { RedisModule } from "./redis/redis.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { SosModule } from "./sos/sos.module";
import { TeamsModule } from "./teams/teams.module";
import { TripsModule } from "./trips/trips.module";
import { UsersModule } from "./users/users.module";
import { LocationsModule } from "./locations/locations.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === "production" ? [] : [".env", ".env.example"]
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.getOrThrow<string>("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
        ssl: config.get<string>("DATABASE_SSL", process.env.NODE_ENV === "production" ? "true" : "false") === "true"
          ? { rejectUnauthorized: false }
          : false
      })
    }),
    RedisModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    TripsModule,
    LocationsModule,
    RealtimeModule,
    AlertsModule,
    SosModule,
    CheckpointsModule,
    CameraPointsModule,
    AdminModule,
    HealthModule
  ]
})
export class AppModule {}
