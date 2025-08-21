// path: apps/backend/src/database/seeds/seeds.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SeedsService } from './seeds.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Company } from '../entities/company.entity';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Role, Company]),
  ],
  providers: [SeedsService, AuditService],
  exports: [SeedsService],
})
export class SeedsModule {}
