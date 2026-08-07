type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The public URL says `?area=<slug>`; the API says `?workingArea=<slug>`. The
 * short form is what appears in a shared link, so the translation lives here
 * rather than in nine call sites.
 */
export function areaFromSearchParams(params: SearchParams): string | undefined {
  const raw = params.area;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
