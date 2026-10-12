import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceListPage } from "@/components/admin/resource-pages";
import { resourceNamed } from "@/lib/admin/resources";

type Params = Promise<{ resource: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { resource } = await params;
  return { title: resourceNamed(resource)?.label ?? "Not found" };
}

export default async function ResourceListRoute({ params }: { params: Params }) {
  const { resource } = await params;
  if (!resourceNamed(resource)) notFound();
  return <ResourceListPage name={resource} />;
}
