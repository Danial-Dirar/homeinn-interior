"use client";

import { canEdit } from "@/lib/admin/roles";
import { resourceNamed, type ResourceDef } from "@/lib/admin/resources";
import { useAdmin } from "./admin-context";
import { ResourceForm } from "./resource-form";
import { ResourceList } from "./resource-list";
import { Notice, PageHeader } from "./ui";

// A resource's definition holds functions and icon components, which cannot
// cross from a server page to a client component, so pages pass its name.

function AdminsOnly({ resource }: { resource: ResourceDef }) {
  return (
    <>
      <PageHeader title={resource.label} />
      <Notice tone="info">
        Only an admin can change {resource.label.toLowerCase()}: they shape the site itself. Ask an admin if
        something here needs changing.
      </Notice>
    </>
  );
}

export function ResourceListPage({ name }: { name: string }) {
  const { user } = useAdmin();
  const resource = resourceNamed(name);
  if (!resource) return null;
  return canEdit(resource, user.role) ? <ResourceList resource={resource} /> : <AdminsOnly resource={resource} />;
}

export function ResourceFormPage({ name, id, justCreated }: { name: string; id?: string; justCreated?: boolean }) {
  const { user } = useAdmin();
  const resource = resourceNamed(name);
  if (!resource) return null;
  return canEdit(resource, user.role)
    ? <ResourceForm resource={resource} id={id} justCreated={justCreated} />
    : <AdminsOnly resource={resource} />;
}
