// path: apps/backend/src/modules/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { UserInvite } from '../../database/entities/user-invite.entity';
import { UserConsent } from '../../database/entities/user-consent.entity';
import { Company } from '../../database/entities/company.entity';

// Controller
import { UsersController } from './users.controller';

// Main Service
import { UsersService } from './users.service';

// Business Services
import { UsersBusinessService } from './services/users-business.service';
import { UsersDataService } from './services/users-data.service';
import { UsersValidationService } from './services/users-validation.service';
import { UsersMapperService } from './services/users-mapper.service';
import { UsersInvitationsService } from './services/users-invitations.service';
import { UsersConsentsService } from './services/users-consents.service';

// 🔐 NEW: Role Hierarchy Service
import { RoleHierarchyService } from './services/role-hierarchy.service';

// 🔐 NEW: System Role Protection Guard
import { SystemRoleProtectionGuard } from './guards/system-role-protection.guard';

// Common
import { CommonModule } from '../../common/common.module';

// Auth Module (for circular dependency resolution)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserInvite,
      UserConsent,
      Company,
    ]),
    CommonModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [
    // Main Service
    UsersService,

    // Business Services
    UsersBusinessService,
    UsersDataService,
    UsersValidationService,
    UsersMapperService,
    UsersInvitationsService,
    UsersConsentsService,

    // 🔐 NEW: Role Hierarchy Service
    RoleHierarchyService,

    // 🔐 NEW: System Role Protection Guard
    SystemRoleProtectionGuard,
  ],
  exports: [
    UsersService,
    UsersBusinessService,
    UsersDataService,
    UsersValidationService,
    UsersInvitationsService,
    UsersConsentsService,
    
    // 🔐 NEW: Экспортируем для использования в других модулях
    RoleHierarchyService,
    SystemRoleProtectionGuard,
  ],
})
export class UsersModule {}
