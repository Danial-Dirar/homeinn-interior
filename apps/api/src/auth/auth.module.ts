import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import { PasswordService } from "./password.service";
import { RolesGuard } from "./roles.guard";
import { TokenService } from "./token.service";
import { UsersService } from "./users.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, UsersService, JwtGuard, RolesGuard],
  exports: [TokenService, UsersService, PasswordService, JwtGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
