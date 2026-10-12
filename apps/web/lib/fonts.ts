import { Anek_Bangla, Geist, Righteous } from "next/font/google";
import localFont from "next/font/local";

// The logo's typeface. One weight, Latin only — the display stack in
// globals.css falls back to Anek Bangla for Bangla glyphs.
const righteous = Righteous({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous",
  display: "swap",
});

// Righteous's own "&" reads as a "€" — "Office € Bank Furniture". This is
// Fredoka 600's ampersand alone (an 892-byte subset from Google Fonts, SIL OFL
// 1.1), whose rounded terminals sit with Righteous. `unicode-range` limits it to
// U+0026, so it can never take over any other character. Declared 400 because
// that is the weight the display classes ask for.
const amp = localFont({
  src: "../fonts/fredoka-ampersand.woff2",
  weight: "400",
  variable: "--font-amp",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0026" }],
});

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const anek = Anek_Bangla({ subsets: ["bengali"], variable: "--font-anek", display: "swap" });

/** Goes on `<html>`; the per-locale stack is picked on `<body>` by `fontClassFor`. */
export const fontVariables = `${amp.variable} ${righteous.variable} ${geist.variable} ${anek.variable}`;
