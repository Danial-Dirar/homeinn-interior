import { Injectable } from "@nestjs/common";
import type { SiteSettings } from "@prisma/client";
import type { UpdateSettingsInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";

const SINGLETON_ID = "singleton";

/**
 * A fresh database has no settings row and `GET /api/settings` must still answer,
 * so both reads and writes upsert. These blanks are placeholders — the seed in
 * Task 14 replaces them with the real business details.
 */
const BLANK = {
  phone: "",
  whatsapp: "",
  email: "",
  addressEn: "",
  addressBn: "",
  hoursEn: "",
  hoursBn: "",
  establishedYear: 2015,
  corporateProjectCount: 0,
  residentialProjectCount: 0,
  districtCount: 0,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get(): Promise<SiteSettings> {
    return this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID, ...BLANK },
    });
  }

  update(input: UpdateSettingsInput): Promise<SiteSettings> {
    return this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      update: input,
      create: { id: SINGLETON_ID, ...BLANK, ...input },
    });
  }
}
