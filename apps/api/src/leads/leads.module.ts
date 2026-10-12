import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LeadNotifier, mailConfigFromEnv } from "./lead-notifier";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    { provide: LeadNotifier, useFactory: () => new LeadNotifier(mailConfigFromEnv()) },
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
