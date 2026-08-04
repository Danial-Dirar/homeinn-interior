import { Controller, Get } from "@nestjs/common";
import { ClientsService } from "./clients.service";

/**
 * Read-only. Both client lists come from the company profile and are owned by
 * the seed, so there is no admin CRUD surface here — and deliberately no route
 * that returns unconsented residential rows. See spec §11.
 */
@Controller("clients")
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get("corporate")
  corporate() {
    return this.clients.listCorporatePublic();
  }

  @Get("residential-summary")
  residentialSummary() {
    return this.clients.residentialSummary();
  }

  /** Only rows whose owner consented to being named. */
  @Get("residential")
  residential() {
    return this.clients.listResidentialPublic();
  }
}
