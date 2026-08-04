import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows the request when no roles are required", () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx({ role: "EDITOR" }))).toBe(true);
  });

  it("allows a matching role", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN"] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx({ role: "ADMIN" }))).toBe(true);
  });

  it("forbids a non-matching role", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN"] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx({ role: "EDITOR" })))
      .toThrow(ForbiddenException);
  });

  it("forbids when there is no user on the request", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN"] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx(undefined)))
      .toThrow(ForbiddenException);
  });
});
