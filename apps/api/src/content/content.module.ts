import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";
import { WorkingAreasController } from "./working-areas.controller";
import { WorkingAreasService } from "./working-areas.service";

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, WorkingAreasController, ProjectsController],
  providers: [ServicesService, WorkingAreasService, ProjectsService],
  exports: [ServicesService, WorkingAreasService, ProjectsService],
})
export class ContentModule {}
