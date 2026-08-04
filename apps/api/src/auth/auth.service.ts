import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthUser, LoginInput } from "@homeinn/types";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { UsersService } from "./users.service";

export interface LoginResult {
  user: AuthUser;
  access: string;
  refresh: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const record = await this.users.findByEmail(input.email);
    // Same error for unknown email and bad password — no account enumeration.
    if (!record) throw new UnauthorizedException("Invalid credentials");

    const ok = await this.passwords.verify(record.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const user: AuthUser = {
      id: record.id, email: record.email, name: record.name, role: record.role,
    };
    return {
      user,
      access: await this.tokens.signAccess(user),
      refresh: await this.tokens.issueRefresh(user.id),
    };
  }
}
