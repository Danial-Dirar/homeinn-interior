import { Injectable } from "@nestjs/common";
import type { CorporateClient, ResidentialClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ResidentialSummary {
  total: number;
  districts: string[];
}

/** Known districts appearing in the company profile's address lines. */
const DISTRICTS = [
  "Dhaka", "Savar", "Narayanganj", "Gopalganj", "Barishal", "Chittagong",
  "Rangpur", "Sylhet", "Tangail", "Manikganj", "Narshingdi", "Noakhali", "Natore",
];

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  listCorporatePublic(): Promise<CorporateClient[]> {
    return this.prisma.corporateClient.findMany({ orderBy: { serial: "asc" } });
  }

  /**
   * Aggregate only. Spec §11: the residential list names private individuals
   * with their neighbourhoods, and consent for a PDF sent to one prospect is not
   * consent for a public web page. Names never leave this method.
   */
  async residentialSummary(): Promise<ResidentialSummary> {
    const [total, rows] = await Promise.all([
      this.prisma.residentialClient.count(),
      this.prisma.residentialClient.findMany({ select: { address: true } }),
    ]);
    const districts = DISTRICTS.filter((d) =>
      rows.some((r) => r.address.toLowerCase().includes(d.toLowerCase())),
    );
    return { total, districts };
  }

  listResidentialPublic(): Promise<ResidentialClient[]> {
    return this.prisma.residentialClient.findMany({
      where: { publiclyListed: true },
      orderBy: { serial: "asc" },
    });
  }
}
