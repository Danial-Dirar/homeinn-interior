import { encode } from "blurhash";
import sharp from "sharp";

/** Component counts along each axis. 4×3 is the reference default for landscape. */
const COMPONENTS_X = 4;
const COMPONENTS_Y = 3;

/**
 * A blurhash of the source image. Encoded from a 32px thumbnail because the
 * algorithm only ever produces a handful of DCT components — feeding it full
 * resolution costs time and changes nothing.
 */
export async function blurhashOf(source: Buffer): Promise<string> {
  const { data, info } = await sharp(source)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  return encode(new Uint8ClampedArray(data), info.width, info.height, COMPONENTS_X, COMPONENTS_Y);
}
