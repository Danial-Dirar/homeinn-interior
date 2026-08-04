import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

const schema = z.object({ name: z.string().min(2) });

describe("ZodValidationPipe", () => {
  it("returns the parsed value when valid", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: "Ada" })).toEqual({ name: "Ada" });
  });

  it("strips unknown keys", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: "Ada", admin: true })).toEqual({ name: "Ada" });
  });

  it("throws BadRequestException listing the issues when invalid", () => {
    const pipe = new ZodValidationPipe(schema);
    expect.assertions(2);
    try {
      pipe.transform({ name: "A" });
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { issues: unknown[] };
      expect(body.issues).toHaveLength(1);
    }
  });
});
