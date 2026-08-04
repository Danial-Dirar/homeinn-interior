import { ClientsService } from "./clients.service";

const residential = [
  { id: "1", serial: 1, clientName: "Dr. Brig. Masud Ahmed", address: "Jolshiri Project, Purbachol, Dhaka", publiclyListed: false, needsVerification: false },
  { id: "2", serial: 2, clientName: "Md. Zahirul Alam", address: "Zinda Bazar, Sylhet", publiclyListed: false, needsVerification: false },
  { id: "3", serial: 3, clientName: "Consenting Client", address: "Mirpur, Dhaka", publiclyListed: true, needsVerification: false },
];

function fakePrisma() {
  return {
    residentialClient: {
      findMany: async ({ where }: { where?: { publiclyListed?: boolean } }) =>
        residential.filter((r) =>
          where?.publiclyListed === undefined ? true : r.publiclyListed === where.publiclyListed),
      count: async () => residential.length,
    },
    corporateClient: { findMany: async () => [] },
  };
}

describe("ClientsService — residential privacy", () => {
  it("residentialSummary never returns a client name", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    const summary = await svc.residentialSummary();
    const serialised = JSON.stringify(summary);
    expect(serialised).not.toContain("Masud");
    expect(serialised).not.toContain("Zahirul");
    expect(serialised).not.toContain("Consenting");
  });

  it("residentialSummary reports the true total", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    expect((await svc.residentialSummary()).total).toBe(3);
  });

  it("residentialSummary derives districts from addresses", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    const { districts } = await svc.residentialSummary();
    expect(districts).toEqual(expect.arrayContaining(["Dhaka", "Sylhet"]));
  });

  it("listResidentialPublic returns only consented rows", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    const out = await svc.listResidentialPublic();
    expect(out).toHaveLength(1);
    expect(out[0]!.clientName).toBe("Consenting Client");
  });
});
