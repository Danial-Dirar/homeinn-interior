/**
 * The 73 corporate project entries from the company profile PDF.
 *
 * SOURCE MISSING. The profile PDF is not in this repository and spec §2 records
 * only the count (73), the district list, and the flagship names — not the rows
 * themselves. Transcribing requires the source document; guessing company names
 * and addresses would manufacture credibility the company has not earned
 * (spec §12), so this list stays empty until the PDF or a transcription lands.
 *
 * When filling it in: one entry per project (not per client — Multiple Health
 * Pharma appears four times and Asia Sourcing three, and the site publishes
 * "73 corporate projects", never "73 clients"). Set `isFlagship: true` on
 * BFIDC, CMH Dermatology Department, Department of Narcotics, Gulshan Zone
 * Sub-Register Office, Khilgaon Zone Sub-Register Office, Prime Medical College
 * & Hospital, Mohila Polytechnic Institute, and Woodora Furniture Ltd.
 */
export interface CorporateClientSeed {
  serial: number;
  companyName: string;
  address: string;
  isFlagship?: boolean;
  needsVerification?: boolean;
}

export const corporateClients: CorporateClientSeed[] = [];
