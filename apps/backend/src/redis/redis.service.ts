import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>("REDIS_URL"));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  lastLocationKey(tripId: string, userId: string) {
    return `last_location:${tripId}:${userId}`;
  }

  onlineUsersKey(tripId: string) {
    return `online_users:${tripId}`;
  }

  activeSosKey(tripId: string) {
    return `active_sos:${tripId}`;
  }
}
