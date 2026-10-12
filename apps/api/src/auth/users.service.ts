import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type AdminUser } from "@prisma/client";
import type { CreateUserInput, UpdateUserInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "./password.service";

/** An account as the panel sees it: never the hash. */
export type PublicUser = Omit<AdminUser, "passwordHash">;

const PUBLIC = { omit: { passwordHash: true } } as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { id } });
  }

  list(): Promise<PublicUser[]> {
    return this.prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, ...PUBLIC });
  }

  async create(input: CreateUserInput): Promise<PublicUser> {
    try {
      return await this.prisma.adminUser.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          passwordHash: await this.passwords.hash(input.password),
        },
        ...PUBLIC,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("An account with that email already exists");
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<PublicUser> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException("Account not found");
    if (existing.role === "ADMIN" && input.role === "EDITOR" && (await this.adminCount()) === 1) {
      throw new ConflictException("This is the last admin; make someone else an admin first");
    }
    return this.prisma.adminUser.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        ...(input.password ? { passwordHash: await this.passwords.hash(input.password) } : {}),
      },
      ...PUBLIC,
    });
  }

  async remove(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) throw new BadRequestException("You cannot delete your own account");
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException("Account not found");
    if (existing.role === "ADMIN" && (await this.adminCount()) === 1) {
      throw new ConflictException("This is the last admin");
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.adminUser.delete({ where: { id } });
  }

  /** Replaces a password after checking the current one. */
  async changePassword(id: string, current: string, next: string): Promise<void> {
    const record = await this.findById(id);
    if (!record || !(await this.passwords.verify(record.passwordHash, current))) {
      throw new BadRequestException("The current password is not correct");
    }
    await this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash: await this.passwords.hash(next) },
    });
  }

  private adminCount(): Promise<number> {
    return this.prisma.adminUser.count({ where: { role: "ADMIN" } });
  }
}
