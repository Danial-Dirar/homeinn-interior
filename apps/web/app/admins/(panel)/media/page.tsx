import type { Metadata } from "next";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata: Metadata = { title: "Media" };

export default function MediaPage() {
  return <MediaLibrary />;
}
