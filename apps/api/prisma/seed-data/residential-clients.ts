/**
 * The 57 residential project entries from the company profile PDF.
 *
 * SOURCE MISSING — see the note in `corporate-clients.ts`. These rows name private
 * individuals alongside their neighbourhoods, so inventing them is not merely
 * inaccurate, it fabricates people. The list stays empty until the source lands.
 *
 * When filling it in:
 * - Serials 17 and 33 are unreadable in the PDF text layer. Seed them as
 *   `clientName: "(unreadable in source)"`, `address: "(unreadable in source)"`,
 *   `needsVerification: true`. Do not guess.
 * - Leave `publiclyListed` at its default `false` for every row. Consent for a PDF
 *   sent to one prospect is not consent for a public web page (spec §11); the
 *   public API only ever returns an aggregate count and district list.
 */
export interface ResidentialClientSeed {
  serial: number;
  clientName: string;
  address: string;
  needsVerification?: boolean;
}

export const residentialClients: ResidentialClientSeed[] = [];
