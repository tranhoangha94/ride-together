import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService
  ) {}

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
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials.");
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
