import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>("GOOGLE_CLIENT_ID"));
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException("Email or phone is required.");
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        phone: dto.phone,
        displayName: dto.displayName,
        passwordHash
      })
    );
    return this.authResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder("user")
      .where("user.email = :value OR user.phone = :value", { value: dto.emailOrPhone })
      .getOne();
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials.");
    }
    return this.authResponse(user);
  }

  async loginWithGoogle(idToken: string) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw new BadRequestException("Google sign-in is not configured on this server.");
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException("Invalid Google token.");
    }

    if (!payload?.sub || !payload.email_verified) {
      throw new UnauthorizedException("Google account could not be verified.");
    }

    let user = await this.users.findOneBy({ googleId: payload.sub });

    if (!user && payload.email) {
      // Link an existing password-based account that shares this verified email.
      user = await this.users.findOneBy({ email: payload.email });
      if (user) {
        user.googleId = payload.sub;
        user = await this.users.save(user);
      }
    }

    if (!user) {
      user = await this.users.save(
        this.users.create({
          email: payload.email,
          googleId: payload.sub,
          displayName: payload.name ?? payload.email ?? "Rider",
          avatarUrl: payload.picture
        })
      );
    }

    return this.authResponse(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: "user" | "admin" }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET
      });
      const user = await this.users.findOneByOrFail({ id: payload.sub });
      return this.authResponse(user);
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }
  }

  logout() {
    return { success: true };
  }

  private authResponse(user: User) {
    const payload = { sub: user.id, role: user.role };
    return {
      user: this.serializeUser(user),
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_TTL ?? "30d"
      })
    };
  }

  private serializeUser(user: User) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
