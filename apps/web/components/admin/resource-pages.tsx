"use client";

import { resourceNamed } from "@/lib/admin/resources";
import { ResourceForm } from "./resource-form";
import { ResourceList } from "./resource-list";

// A resource's definition holds functions and icon components, which cannot
// cross from a server page to a client component, so pages pass its name.

export function ResourceListPage({ name }: { name: string }) {
  const resource = resourceNamed(name);
  return resource ? <ResourceList resource={resource} /> : null;
}

export function ResourceFormPage({ name, id, justCreated }: { name: string; id?: string; justCreated?: boolean }) {
  const resource = resourceNamed(name);
  return resource ? <ResourceForm resource={resource} id={id} justCreated={justCreated} /> : null;
}
