import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { authUserSchema, type AuthUser } from "@homeinn/types";

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = (req.cookies?.["hi_access"] as string | undefined) ?? bearer;
    if (!token) throw new UnauthorizedException("Not authenticated");

    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; email: string; name: string; role: string }>(
        token, { secret: process.env.JWT_ACCESS_SECRET },
      );
      req.user = authUserSchema.parse({
        id: claims.sub, email: claims.email, name: claims.name, role: claims.role,
      });
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
