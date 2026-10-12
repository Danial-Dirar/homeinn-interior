import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { ContentModule } from "./content/content.module";
import { LeadsModule } from "./leads/leads.module";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RevalidateInterceptor, RevalidateNotifier } from "./revalidate/revalidate";
import { SettingsModule } from "./settings/settings.module";

@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env"] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    MediaModule,
    LeadsModule,
    ContentModule,
    SettingsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Built when the app starts, after ConfigModule has read ../../.env.
    { provide: RevalidateNotifier, useFactory: () => new RevalidateNotifier() },
    { provide: APP_INTERCEPTOR, useClass: RevalidateInterceptor },
  ],
})
export class AppModule {}
