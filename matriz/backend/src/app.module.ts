import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, HealthModule, AccountsModule],
})
export class AppModule {}
