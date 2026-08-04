import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards, UsePipes } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema, type AuthUser, type LoginInput } from "@homeinn/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtGuard } from "./jwt.guard";
import { TokenService } from "./token.service";
import { UsersService } from "./users.service";

const ACCESS_COOKIE = "hi_access";
const REFRESH_COOKIE = "hi_refresh";

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const { user, access, refresh } = await this.auth.login(body);
    res.cookie(ACCESS_COOKIE, access, cookieOptions(15 * 60_000));
    res.cookie(REFRESH_COOKIE, refresh, cookieOptions(7 * 86_400_000));
    return { user };
  }

  @Get("me")
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!presented) throw new UnauthorizedException("No refresh token");

    const { userId, refresh } = await this.tokens.rotate(presented);
    const record = await this.users.findById(userId);
    if (!record) throw new UnauthorizedException("Unknown user");

    const access = await this.tokens.signAccess({
      id: record.id, email: record.email, name: record.name, role: record.role,
    });
    res.cookie(ACCESS_COOKIE, access, cookieOptions(15 * 60_000));
    res.cookie(REFRESH_COOKIE, refresh, cookieOptions(7 * 86_400_000));
    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (presented) {
      const row = await this.tokens.rotate(presented).catch(() => null);
      if (row) await this.tokens.revokeAll(row.userId);
    }
    res.clearCookie(ACCESS_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return { ok: true };
  }
}
