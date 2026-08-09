import { Controller, Get } from "@nestjs/common";
import { ClientLogosService } from "./client-logos.service";

@Controller("client-logos")
export class ClientLogosController {
  constructor(private readonly clientLogos: ClientLogosService) {}

  /** Public. Drives the logo marquee on /clients. */
  @Get()
  list() {
    return this.clientLogos.listPublic();
  }
}
