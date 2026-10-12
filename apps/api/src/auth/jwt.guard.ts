import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { AuthUser } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";

interface AccessClaims {
  sub: string;
  iat: number;
  iatMs?: number;
}

/**
 * Checks the access token, then the account behind it. The account is read
 * on every request rather than trusted from the token: a deleted account, a
 * reset password or a removed admin role takes effect at once, not fifteen
 * minutes later when the token would have expired. Admin traffic is a handful
 * of people, so the extra read costs nothing that matters.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = (req.cookies?.["hi_access"] as string | undefined) ?? bearer;
    if (!token) throw new UnauthorizedException("Not authenticated");

    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const account = await this.prisma.adminUser.findUnique({ where: { id: claims.sub } });
    if (!account) throw new UnauthorizedException("This account no longer exists");

    const issuedAt = claims.iatMs ?? claims.iat * 1000;
    if (account.sessionsValidAfter && issuedAt < account.sessionsValidAfter.getTime()) {
      throw new UnauthorizedException("This session has ended; please sign in again");
    }

    req.user = { id: account.id, email: account.email, name: account.name, role: account.role };
    return true;
  }
}
