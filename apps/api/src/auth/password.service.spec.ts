import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const svc = new PasswordService();

  it("produces an argon2id hash that is not the plaintext", async () => {
    const hash = await svc.hash("correct horse battery");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("correct horse battery");
  });

  it("verifies a correct password", async () => {
    const hash = await svc.hash("correct horse battery");
    await expect(svc.verify(hash, "correct horse battery")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await svc.hash("correct horse battery");
    await expect(svc.verify(hash, "wrong horse battery")).resolves.toBe(false);
  });

  it("returns false rather than throwing on a malformed hash", async () => {
    await expect(svc.verify("not-a-hash", "anything")).resolves.toBe(false);
  });

  it("produces a different hash for the same input each time", async () => {
    const a = await svc.hash("same input");
    const b = await svc.hash("same input");
    expect(a).not.toBe(b);
  });
});
