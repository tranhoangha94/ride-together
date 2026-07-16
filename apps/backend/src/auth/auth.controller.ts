import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { GoogleAuthDto, LoginDto, RefreshDto, RegisterDto } from "./dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("google")
  loginWithGoogle(@Body() dto: GoogleAuthDto) {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout() {
    return this.auth.logout();
  }
}
