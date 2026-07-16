import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export type OptionalAuthUser = { id: string; role: "user" | "admin" };

// Rooms must keep working with no token at all (guests), so this never
// throws - it just resolves to null on a missing/invalid/expired token,
// unlike JwtAuthGuard which rejects the request outright.
@Injectable()
export class OptionalAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async resolve(token?: string | null): Promise<OptionalAuthUser | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: "user" | "admin" }>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET")
      });
      return { id: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  fromAuthHeader(header?: string | null): string | undefined {
    if (!header?.startsWith("Bearer ")) return undefined;
    return header.slice("Bearer ".length);
  }
}
