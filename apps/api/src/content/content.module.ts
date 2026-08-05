import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MediaModule } from "../media/media.module";
import { BlogController } from "./blog.controller";
import { BlogService } from "./blog.service";
import { CertificationsController } from "./certifications.controller";
import { CertificationsService } from "./certifications.service";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";
import { HeroController } from "./hero.controller";
import { HeroService } from "./hero.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";
import { TeamController } from "./team.controller";
import { TeamService } from "./team.service";
import { TestimonialsController } from "./testimonials.controller";
import { TestimonialsService } from "./testimonials.service";
import { WorkingAreasController } from "./working-areas.controller";
import { WorkingAreasService } from "./working-areas.service";

const services = [
  ServicesService, WorkingAreasService, ProjectsService, ClientsService,
  HeroService, BlogService, TestimonialsService, TeamService, CertificationsService,
];

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [
    ServicesController, WorkingAreasController, ProjectsController, ClientsController,
    HeroController, BlogController, TestimonialsController, TeamController,
    CertificationsController,
  ],
  providers: services,
  exports: services,
})
export class ContentModule {}
