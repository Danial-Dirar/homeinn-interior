"use client";

import { Button, Sheet, SheetContent, SheetTitle } from "@homeinn/ui";
import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminSend } from "@/lib/admin/api";
import type { MediaView } from "@/lib/admin/fields";
import { useAdmin } from "./admin-context";
import { UploadForm } from "./media-picker";
import { controlClass, EmptyState, FieldShell, Loading, Notice, PageHeader, Thumb } from "./ui";

const PER_PAGE = 36;

/** Every image the site uses: upload, describe, correct and remove. */
export function MediaLibrary() {
  const { user } = useAdmin();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaView[] | null>(null);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<MediaView | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
      if (query.trim()) params.set("q", query.trim());
      adminGet<{ items: MediaView[]; total: number }>(`/media?${params}`)
        .then((res) => {
          if (!live) return;
          setItems((current) => (page === 1 ? res.items : [...(current ?? []), ...res.items]));
          setTotal(res.total);
        })
        .catch((e: Error) => live && setMessage({ tone: "error", text: e.message }));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query, page]);

  function replaced(media: MediaView) {
    setItems((list) => (list ?? []).map((m) => (m.id === media.id ? media : m)));
  }

  async function remove(media: MediaView) {
    if (!window.confirm("Delete this image from the library? This cannot be undone.")) return;
    try {
      await adminSend("DELETE", `/media/${media.id}`);
      setItems((list) => (list ?? []).filter((m) => m.id !== media.id));
      setTotal((t) => t - 1);
      setEditing(null);
      setMessage({ tone: "success", text: "The image was deleted." });
    } catch (e) {
      setMessage({
        tone: "error",
        text: (e as { status?: number }).status === 409
          ? "This image is still used on the site. Remove it from its project, service or page first."
          : (e as Error).message,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Media"
        description="Every image on the site. Each one carries a description in English and Bangla, read aloud to visitors who cannot see it."
      />
      <div className="mb-8">
        <UploadForm onUploaded={(media) => { setItems((list) => [media, ...(list ?? [])]); setTotal((t) => t + 1); setMessage({ tone: "success", text: "Uploaded." }); }} />
      </div>
      <div className="mb-6 max-w-sm">
        <FieldShell id="library-search" label="Search" help={items ? `${total} image${total === 1 ? "" : "s"}` : undefined}>
          <input id="library-search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className={controlClass} />
        </FieldShell>
      </div>
      {message ? <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div> : null}
      {!items ? <Loading label="Loading the library" /> : null}
      {items && items.length === 0 ? <EmptyState>No images {query ? "match" : "yet"}.</EmptyState> : null}
      {items && items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((media) => (
            <li key={media.id}>
              <button type="button" onClick={() => setEditing(media)} className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <span className="block aspect-square overflow-hidden bg-ink/10 ring-2 ring-transparent group-hover:ring-ink/30"><Thumb media={media} /></span>
                <span className="mt-1.5 line-clamp-2 block text-xs text-ink/75">{media.altEn}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {items && items.length < total ? (
        <Button type="button" variant="outline" className="mt-6" onClick={() => setPage((p) => p + 1)}>Load more</Button>
      ) : null}

      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto bg-bone p-6 text-ink sm:p-8">
          <SheetTitle className="font-display text-2xl">Image</SheetTitle>
          {editing ? (
            <AltEditor key={editing.id} media={editing} canDelete={user.role === "ADMIN"} onSaved={replaced} onDelete={() => remove(editing)} />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AltEditor({ media, canDelete, onSaved, onDelete }: {
  media: MediaView;
  canDelete: boolean;
  onSaved: (media: MediaView) => void;
  onDelete: () => void;
}) {
  const [altEn, setAltEn] = useState(media.altEn);
  const [altBn, setAltBn] = useState(media.altBn);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await adminSend<MediaView>("PATCH", `/media/${media.id}`, { altEn: altEn.trim(), altBn: altBn.trim() });
      onSaved(saved);
      setMessage({ tone: "success", text: "Saved." });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 flex flex-col gap-5">
      <div className="overflow-hidden bg-ink/10"><Thumb media={media} className="h-auto" /></div>
      <p className="text-xs text-ink/65">{media.width} × {media.height} pixels</p>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <FieldShell id="alt-en" label="Description (English)" required>
        <textarea id="alt-en" rows={3} value={altEn} onChange={(e) => setAltEn(e.target.value)} className={controlClass} maxLength={300} />
      </FieldShell>
      <FieldShell id="alt-bn" label="Description (Bangla)" required>
        <textarea id="alt-bn" lang="bn" rows={3} value={altBn} onChange={(e) => setAltBn(e.target.value)} className={controlClass} maxLength={300} />
      </FieldShell>
      <div className="flex items-center justify-between gap-4">
        <Button type="submit" disabled={busy || !altEn.trim() || !altBn.trim()}>{busy ? "Saving…" : "Save"}</Button>
        {canDelete ? <button type="button" onClick={onDelete} className="text-sm text-[#9B2C1F] underline-offset-4 hover:underline">Delete image</button> : null}
      </div>
    </form>
  );
}
