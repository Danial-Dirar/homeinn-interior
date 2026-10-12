"use client";

import { Button, Sheet, SheetContent, SheetTitle } from "@homeinn/ui";
import { Check, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminUpload } from "@/lib/admin/api";
import type { MediaView } from "@/lib/admin/fields";
import { controlClass, FieldShell, Loading, Notice, Thumb } from "./ui";

const PER_PAGE = 24;

interface MediaPage {
  items: MediaView[];
  total: number;
}

/**
 * Chooses images from the library, or uploads new ones on the spot. Every
 * upload asks for alt text in both languages: the site renders it as the
 * image's description, and the API refuses an image without it.
 */
export function MediaPicker({
  open, onOpenChange, multiple = false, onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  onChoose: (media: MediaView[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaView[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
      if (query.trim()) params.set("q", query.trim());
      adminGet<MediaPage>(`/media?${params}`)
        .then((res) => {
          if (!live) return;
          setItems((current) => (page === 1 ? res.items : [...(current ?? []), ...res.items]));
          setTotal(res.total);
        })
        .catch((e: Error) => live && setError(e.message));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [open, query, page]);

  // Each opening starts afresh from the first page: carrying on from where
  // "Load more" left off would append that page again.
  useEffect(() => {
    if (open) return;
    setSelected([]);
    setPage(1);
    setItems(null);
  }, [open]);

  function pick(media: MediaView) {
    if (!multiple) {
      onChoose([media]);
      onOpenChange(false);
      return;
    }
    setSelected((current) => (current.some((m) => m.id === media.id)
      ? current.filter((m) => m.id !== media.id)
      : [...current, media]));
  }

  function uploaded(media: MediaView) {
    setItems((current) => [media, ...(current ?? [])]);
    setTotal((t) => t + 1);
    pick(media);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-3xl flex-col gap-5 overflow-y-auto bg-bone p-6 text-ink sm:p-8">
        <SheetTitle className="font-display text-2xl">{multiple ? "Add images" : "Choose an image"}</SheetTitle>

        <UploadForm onUploaded={uploaded} />

        <FieldShell id="media-search" label="Search the library" help="Searches the alt text, in English or Bangla.">
          <input
            id="media-search" type="search" value={query} className={controlClass}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </FieldShell>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {!items ? <Loading label="Loading the library" /> : null}
        {items && items.length === 0 ? <p className="text-sm text-ink/70">No images match.</p> : null}

        {items && items.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((media) => {
              const chosen = selected.some((m) => m.id === media.id);
              return (
                <li key={media.id}>
                  <button
                    type="button"
                    onClick={() => pick(media)}
                    aria-pressed={multiple ? chosen : undefined}
                    className="group relative block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className={`block aspect-square overflow-hidden bg-ink/10 ring-2 ${chosen ? "ring-brand" : "ring-transparent group-hover:ring-ink/30"}`}>
                      <Thumb media={media} />
                    </span>
                    {chosen ? (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center bg-brand text-white">
                        <Check aria-hidden="true" className="size-4" />
                      </span>
                    ) : null}
                    <span className="mt-1.5 line-clamp-2 block text-xs text-ink/75">{media.altEn}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {items && items.length < total ? (
          <Button type="button" variant="outline" onClick={() => setPage((p) => p + 1)}>Load more</Button>
        ) : null}

        {multiple ? (
          <div className="sticky bottom-0 -mx-6 mt-auto flex items-center justify-between gap-4 border-t border-ink/10 bg-bone px-6 py-4 sm:-mx-8 sm:px-8">
            <span className="text-sm text-ink/70">{selected.length === 1 ? "1 image chosen" : `${selected.length} images chosen`}</span>
            <Button type="button" disabled={selected.length === 0} onClick={() => { onChoose(selected); onOpenChange(false); }}>
              Add to gallery
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function UploadForm({ onUploaded }: { onUploaded: (media: MediaView) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [altEn, setAltEn] = useState("");
  const [altBn, setAltBn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const media = await adminUpload<MediaView>(file, altEn.trim(), altBn.trim());
      onUploaded(media);
      setFile(null);
      setAltEn("");
      setAltBn("");
      setInputKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-dashed border-ink/25 bg-white/60 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium"><Upload aria-hidden="true" className="size-4" /> Upload a new image</p>
      {error ? <div className="mb-3"><Notice tone="error">{error}</Notice></div> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldShell id="upload-file" label="Image file" help="JPEG, PNG or WebP, up to 15 MB.">
          <input
            key={inputKey} id="upload-file" type="file" accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-bone"
          />
        </FieldShell>
        <FieldShell id="upload-alt-en" label="Describe it (English)" required>
          <input id="upload-alt-en" value={altEn} onChange={(e) => setAltEn(e.target.value)} className={controlClass} maxLength={300} />
        </FieldShell>
        <FieldShell id="upload-alt-bn" label="Describe it (Bangla)" required>
          <input id="upload-alt-bn" lang="bn" value={altBn} onChange={(e) => setAltBn(e.target.value)} className={controlClass} maxLength={300} />
        </FieldShell>
      </div>
      <Button type="submit" size="sm" className="mt-4" disabled={busy || !file || !altEn.trim() || !altBn.trim()}>
        {busy ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
