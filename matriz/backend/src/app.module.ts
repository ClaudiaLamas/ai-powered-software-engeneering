import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    HealthModule,
    AccountsModule,
    ProjectsModule,
    TasksModule,
  ],
})
export class AppModule {}
