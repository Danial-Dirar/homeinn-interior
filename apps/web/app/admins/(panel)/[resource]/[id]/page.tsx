import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceFormPage } from "@/components/admin/resource-pages";
import { resourceNamed } from "@/lib/admin/resources";

type Params = Promise<{ resource: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { resource } = await params;
  const def = resourceNamed(resource);
  return { title: def ? `Edit ${def.singular}` : "Not found" };
}

export default async function EditResourceRoute({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ resource, id }, { created }] = await Promise.all([params, searchParams]);
  if (!resourceNamed(resource)) notFound();
  return <ResourceFormPage name={resource} id={id} justCreated={created === "1"} />;
}
