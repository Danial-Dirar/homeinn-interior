import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import type { AuthUser } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";

const REFRESH_DAYS = 7;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private static digest(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  signAccess(user: AuthUser): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "15m" },
    );
  }

  async issueRefresh(userId: string): Promise<string> {
    const token = randomBytes(48).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: TokenService.digest(token),
        expiresAt: new Date(Date.now() + REFRESH_DAYS * 86_400_000),
      },
    });
    return token;
  }

  async rotate(presented: string): Promise<{ userId: string; refresh: string }> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: TokenService.digest(presented) },
    });
    if (!row) throw new UnauthorizedException("Invalid refresh token");

    // Replay of an already-rotated token: assume theft, kill every session.
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const refresh = await this.issueRefresh(row.userId);
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), replacedBy: TokenService.digest(refresh) },
    });
    return { userId: row.userId, refresh };
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
