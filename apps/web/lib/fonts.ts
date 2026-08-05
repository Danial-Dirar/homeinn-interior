import { Anek_Bangla, Fraunces, Geist } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const anek = Anek_Bangla({ subsets: ["bengali"], variable: "--font-anek", display: "swap" });

/** Goes on `<html>`; the per-locale stack is picked on `<body>` by `fontClassFor`. */
export const fontVariables = `${fraunces.variable} ${geist.variable} ${anek.variable}`;
