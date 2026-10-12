import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceFormPage } from "@/components/admin/resource-pages";
import { resourceNamed } from "@/lib/admin/resources";

type Params = Promise<{ resource: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { resource } = await params;
  const def = resourceNamed(resource);
  return { title: def ? `New ${def.singular}` : "Not found" };
}

export default async function NewResourceRoute({ params }: { params: Params }) {
  const { resource } = await params;
  if (!resourceNamed(resource)) notFound();
  return <ResourceFormPage name={resource} />;
}
