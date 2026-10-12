import { emailForLead, LeadNotifier } from "./lead-notifier";

const lead = {
  id: "lead1", type: "QUOTE", name: "Rahim Uddin", phone: "01760775454", email: null,
  message: "A three-bedroom flat in Mirpur.", locale: "bn", sourcePath: "/bn/contact",
  service: { titleEn: "Interior Design" },
} as never;

describe("emailForLead", () => {
  it("carries the name, phone, type, service and message, and links to the enquiry", () => {
    const mail = emailForLead(lead, "https://homeinn-interior.com");
    expect(mail.subject).toBe("New enquiry: Rahim Uddin (Quote)");
    for (const part of ["Rahim Uddin", "01760775454", "Interior Design", "A three-bedroom flat in Mirpur.",
      "https://homeinn-interior.com/admins/enquiries/lead1"]) {
      expect(mail.text).toContain(part);
    }
  });
});

describe("LeadNotifier", () => {
  it("does nothing, quietly, when mail is not configured", async () => {
    const notifier = new LeadNotifier({});
    await expect(notifier.leadCreated(lead)).resolves.toBeUndefined();
  });
});
