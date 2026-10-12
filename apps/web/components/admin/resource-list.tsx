"use client";

import { Button } from "@homeinn/ui";
import { ImageOff, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminGet } from "@/lib/admin/api";
import type { AdminRow } from "@/lib/admin/fields";
import type { ResourceDef } from "@/lib/admin/resources";
import { Badge, controlClass, EmptyState, Loading, Notice, PageHeader, Thumb } from "./ui";

/** Every row of a resource, drafts included, with a filter for long lists. */
export function ResourceList({ resource }: { resource: ResourceDef }) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    setRows(null);
    adminGet<AdminRow[]>(`/admin/${resource.name}`)
      .then((list) => live && setRows(list))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [resource]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!rows || !q) return rows;
    return rows.filter((row) => `${resource.title(row)} ${resource.subtitle?.(row) ?? ""}`.toLowerCase().includes(q));
  }, [rows, query, resource]);

  return (
    <>
      <PageHeader
        title={resource.label}
        description={resource.intro}
        actions={
          <Button asChild>
            <Link href={`/admins/${resource.name}/new`}><Plus aria-hidden="true" className="size-4" /> New {resource.singular}</Link>
          </Button>
        }
      />

      {rows && rows.length > 8 ? (
        <div className="mb-5 max-w-sm">
          <label htmlFor="list-filter" className="sr-only">Filter {resource.label.toLowerCase()}</label>
          <input
            id="list-filter" type="search" placeholder={`Filter ${resource.label.toLowerCase()}…`}
            value={query} onChange={(e) => setQuery(e.target.value)} className={controlClass}
          />
        </div>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {!rows && !error ? <Loading label={`Loading ${resource.label.toLowerCase()}`} /> : null}
      {rows && rows.length === 0 ? (
        <EmptyState>Nothing here yet. Use “New {resource.singular}” to add the first.</EmptyState>
      ) : null}

      {shown && shown.length > 0 ? (
        <ul className="divide-y divide-ink/[0.08] border border-ink/10 bg-[#FBF8F3]">
          {shown.map((row) => {
            const thumb = resource.thumbnail?.(row);
            return (
              <li key={row.id}>
                <Link href={`/admins/${resource.name}/${row.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-white">
                  {resource.thumbnail ? (
                    <span className="grid aspect-[4/3] w-20 shrink-0 place-items-center overflow-hidden bg-ink/[0.06]">
                      {thumb ? <Thumb media={thumb} /> : <ImageOff aria-hidden="true" className="size-5 text-ink/40" />}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{resource.title(row) || `Untitled ${resource.singular}`}</span>
                    {resource.subtitle ? <span className="block truncate text-sm text-ink/65">{resource.subtitle(row)}</span> : null}
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {row.featured === true ? <Badge tone="warn">Featured</Badge> : null}
                    {"published" in row ? (
                      <Badge tone={row.published ? "good" : "muted"}>{row.published ? "Published" : "Draft"}</Badge>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rows && shown && shown.length === 0 && rows.length > 0 ? <p className="text-sm text-ink/70">Nothing matches “{query}”.</p> : null}
    </>
  );
}
