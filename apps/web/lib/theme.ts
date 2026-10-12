export type Theme = "dark" | "light";

/** The localStorage key. */
export const THEME_KEY = "hi-theme";

/** The site opens light — the cream of the logo (Muhammad's call); dark is the visitor's choice. */
export const DEFAULT_THEME: Theme = "light";

/** The stored choice, or the default for anything absent, foreign or unreadable. */
export function readTheme(storage: Pick<Storage, "getItem">): Theme {
  try {
    return storage.getItem(THEME_KEY) === "dark" ? "dark" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Runs inline in `<head>`, before anything paints. The server always renders
 * `data-theme="light"`, so without this a dark-theme visitor would see the
 * light page flash first. Kept to a literal so it needs no bundle to run.
 */
export const themeBootScript = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
