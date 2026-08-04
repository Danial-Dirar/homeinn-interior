import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/** Relation writes for a content row's Media join table. */
export function connectGallery(ids: string[] | undefined) {
  return ids ? { gallery: { connect: ids.map((id) => ({ id })) } } : {};
}

export function setGallery(ids: string[] | undefined) {
  return ids ? { gallery: { set: ids.map((id) => ({ id })) } } : {};
}

/** Prisma raises P2025 when `where` matches no row; that is a 404, not a 500. */
export function notFoundIfMissing(e: unknown, message: string): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    return new NotFoundException(message);
  }
  return e;
}
