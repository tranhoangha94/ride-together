import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { Repository } from "typeorm";
import { MailService } from "../mail/mail.service";
import { RedisService } from "../redis/redis.service";
import { User } from "../users/user.entity";
import { LoginDto, RegisterDto } from "./dto";

const EMAIL_OTP_TTL_SECONDS = 10 * 60;

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly mail: MailService
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>("GOOGLE_CLIENT_ID"));
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException("Email or phone is required.");
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    let user: User;
    try {
      user = await this.users.save(
        this.users.create({
          email: dto.email,
          phone: dto.phone,
          displayName: dto.displayName,
          passwordHash
        })
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Email hoặc số điện thoại này đã được đăng ký.");
      }
      throw error;
    }

    // Phone-only signups skip verification entirely (no SMS provider) and
    // log straight in. Email signups must prove ownership before we hand
    // out tokens.
    if (user.email) {
      await this.sendEmailVerificationCode(user);
      return { needsVerification: true, userId: user.id };
    }
    return this.authResponse(user);
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
  }

  private emailOtpKey(userId: string) {
    return `email_otp:${userId}`;
  }

  private async sendEmailVerificationCode(user: User) {
    if (!user.email) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.client.set(this.emailOtpKey(user.id), code, "EX", EMAIL_OTP_TTL_SECONDS);
    await this.mail.sendVerificationCode(user.email, code);
  }

  async resendVerification(userId: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user?.email) throw new BadRequestException("Tài khoản này không dùng email.");
    if (user.emailVerifiedAt) throw new BadRequestException("Email đã được xác thực.");
    await this.sendEmailVerificationCode(user);
    return { sent: true };
  }

  async verifyEmail(userId: string, code: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user?.email) throw new BadRequestException("Tài khoản này không dùng email.");

    const stored = await this.redis.client.get(this.emailOtpKey(userId));
    if (!stored || stored !== code) {
      throw new UnauthorizedException("Mã xác thực không đúng hoặc đã hết hạn.");
    }

    await this.redis.client.del(this.emailOtpKey(userId));
    user.emailVerifiedAt = new Date();
    await this.users.save(user);
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
    if (user.email && !user.emailVerifiedAt) {
      throw new UnauthorizedException({
        message: "Bạn cần xác thực email trước khi đăng nhập.",
        needsVerification: true,
        userId: user.id
      });
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
        user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
        user = await this.users.save(user);
      }
    }

    if (!user) {
      user = await this.users.save(
        this.users.create({
          email: payload.email,
          googleId: payload.sub,
          displayName: payload.name ?? payload.email ?? "Rider",
          avatarUrl: payload.picture,
          // Google already checked payload.email_verified above.
          emailVerifiedAt: new Date()
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
