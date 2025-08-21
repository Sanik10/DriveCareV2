// path: apps/backend/src/modules/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { UsersBusinessService } from './services/users-business.service';
import { UsersDataService } from './services/users-data.service';
import { UsersMapperService } from './services/users-mapper.service';
import { UsersValidationService } from './services/users-validation.service';
import { UsersConsentsService } from './services/users-consents.service';

import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { UserConsent } from '../../database/entities/user-consent.entity';

import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserConsent]),
    CommonModule,
    forwardRef(() => AuthModule), // ⬅️ фикс круговой зависимости
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersBusinessService,
    UsersDataService,
    UsersMapperService,
    UsersValidationService,
    UsersConsentsService,
  ],
  exports: [
    UsersService,
    UsersBusinessService,
    UsersDataService,
    UsersMapperService,
    UsersValidationService,
    UsersConsentsService,
  ],
})
export class UsersModule {}