import { decode } from "blurhash";
import sharp from "sharp";
import { blurhashOf } from "./blurhash";

async function solid(color: string, width = 400, height = 300): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

describe("blurhashOf", () => {
  it("produces a string the reference decoder accepts", async () => {
    const hash = await blurhashOf(await solid("#336699"));
    expect(typeof hash).toBe("string");
    expect(() => decode(hash, 8, 8)).not.toThrow();
  });

  it("encodes the average colour into the DC component", async () => {
    // Bytes 2..6 of a blurhash are the base83-encoded 24-bit sRGB average.
    const hash = await blurhashOf(await solid("#336699"));
    const B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
    let dc = 0;
    for (const c of hash.slice(2, 6)) dc = dc * 83 + B83.indexOf(c);

    const [r, g, b] = [(dc >> 16) & 255, (dc >> 8) & 255, dc & 255];
    expect(Math.abs(r - 0x33)).toBeLessThan(12);
    expect(Math.abs(g - 0x66)).toBeLessThan(12);
    expect(Math.abs(b - 0x99)).toBeLessThan(12);
  });

  it("gives different hashes for different images", async () => {
    expect(await blurhashOf(await solid("#000000")))
      .not.toBe(await blurhashOf(await solid("#ffffff")));
  });
});
