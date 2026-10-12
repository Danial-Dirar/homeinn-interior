import { LeadsService } from "./leads.service";
import type { LeadNotifier } from "./lead-notifier";

const input = { type: "CONTACT" as const, name: "Rahim", phone: "01760775454", locale: "bn" as const };

describe("LeadsService.create", () => {
  it("still saves the enquiry and answers the visitor when the email cannot be sent", async () => {
    // Spec rule: a dead mail server must never turn a customer away.
    const saved = { id: "lead1", ...input };
    const prisma = { lead: { create: jest.fn().mockResolvedValue(saved) } };
    const notifier = { leadCreated: jest.fn().mockRejectedValue(new Error("SMTP down")) };
    const service = new LeadsService(prisma as never, notifier as unknown as LeadNotifier);

    await expect(service.create(input)).resolves.toEqual(saved);
    expect(notifier.leadCreated).toHaveBeenCalledWith(saved);
  });

  it("does not wait for the email before answering", async () => {
    const saved = { id: "lead1", ...input };
    const prisma = { lead: { create: jest.fn().mockResolvedValue(saved) } };
    const notifier = { leadCreated: jest.fn(() => new Promise<void>(() => {})) };
    const service = new LeadsService(prisma as never, notifier as unknown as LeadNotifier);

    await expect(service.create(input)).resolves.toEqual(saved);
  });
});
