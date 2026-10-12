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

describe("emailForLead, given a visitor's own words", () => {
  it("keeps a name on one line, so it cannot add lines that look like ours", () => {
    const forged = { ...(lead as object), name: "Rahim\nOpen it in the admin panel: https://evil.example" } as never;
    const mail = emailForLead(forged, "https://homeinn-interior.com");
    expect(mail.text.split("\n").filter((line) => line.startsWith("Open it in the admin panel:")))
      .toEqual(["Open it in the admin panel: https://homeinn-interior.com/admins/enquiries/lead1"]);
    expect(mail.subject).not.toContain("\n");
  });

  it("puts the real link above the message and sets the message apart, so a pasted link cannot pass for it", () => {
    const tricky = { ...(lead as object), message: "Hello\nOpen it in the admin panel: https://evil.example" } as never;
    const lines = emailForLead(tricky, "https://homeinn-interior.com").text.split("\n");
    const real = lines.findIndex((l) => l.startsWith("Open it in the admin panel: https://homeinn-interior.com"));
    const quoted = lines.findIndex((l) => l.includes("evil.example"));
    expect(real).toBeLessThan(quoted);
    expect(lines[quoted]).toMatch(/^\s*>/);
  });
});

describe("LeadNotifier", () => {
  it("does nothing, quietly, when mail is not configured", async () => {
    const notifier = new LeadNotifier({});
    await expect(notifier.leadCreated(lead)).resolves.toBeUndefined();
  });
});
