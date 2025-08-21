import { Injectable, Logger } from '@nestjs/common';
import { Company } from '../../../database/entities';
import { 
  CompanyResponseDto, 
  CompanyBasicResponseDto, 
  CompanyPublicResponseDto 
} from '../dto/response/company-response.dto';
import { WorkingHoursDto } from '../dto/request/create-company.dto'; // ✅ ДОБАВЛЕНО: Импорт
import { AUTH_CONSTANTS } from '../../auth/constants/auth.constants';

@Injectable()
export class CompaniesMapperService {
  private readonly logger = new Logger(CompaniesMapperService.name);

  mapToResponseDto(company: Company, userRole?: string, userCompanyId?: string): CompanyResponseDto {
    const isSensitiveDataAllowed = this.isSensitiveDataAllowed(userRole, userCompanyId, company.id);

    const baseResponse: CompanyResponseDto = {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logoUrl: company.logoUrl,
      workingHours: company.workingHours as any, // ✅ ИСПРАВЛЕНО: Type assertion
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };

    if (isSensitiveDataAllowed) {
      baseResponse.taxNumber = company.taxNumber;
    }

    return baseResponse;
  }

  mapArrayToResponseDto(
    companies: Company[], 
    userRole?: string, 
    userCompanyId?: string
  ): CompanyResponseDto[] {
    return companies.map(company => 
      this.mapToResponseDto(company, userRole, userCompanyId)
    );
  }

  mapToBasicInfo(company: Company): CompanyBasicResponseDto {
    return {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      website: company.website,
      isActive: company.isActive,
      workingHours: company.workingHours as any, // ✅ ИСПРАВЛЕНО: Type assertion
    };
  }

  mapToExtendedInfo(
    company: Company, 
    userRole?: string, 
    userCompanyId?: string
  ): {
    id: string;
    name: string;
    legalName: string;
    email: string;
    phone?: string;
    address?: string;
    isActive: boolean;
    createdAt: Date;
    taxNumber?: string;
  } {
    const isSensitiveDataAllowed = this.isSensitiveDataAllowed(userRole, userCompanyId, company.id);

    const extendedInfo = {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      isActive: company.isActive,
      createdAt: company.createdAt,
    };

    if (isSensitiveDataAllowed) {
      extendedInfo['taxNumber'] = company.taxNumber;
    }

    return extendedInfo;
  }

  mapToPublicInfo(company: Company): CompanyPublicResponseDto {
    return {
      id: company.id,
      name: company.name,
      website: company.website,
      logoUrl: company.logoUrl,
      workingHours: company.workingHours as any, // ✅ ИСПРАВЛЕНО: Type assertion
      isActive: company.isActive,
    };
  }

  mapToSelectOption(company: Company): { value: string; label: string; disabled?: boolean } {
    return {
      value: company.id,
      label: company.name,
      disabled: !company.isActive,
    };
  }

  mapToAdminResponseDto(company: Company): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      taxNumber: company.taxNumber,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logoUrl: company.logoUrl,
      workingHours: company.workingHours as any, // ✅ ИСПРАВЛЕНО: Type assertion
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  mapToResponseDtoWithSubscription(
    company: Company, 
    subscription?: any,
    userRole?: string,
    userCompanyId?: string
  ): CompanyResponseDto {
    const baseDto = this.mapToResponseDto(company, userRole, userCompanyId);
    
    if (subscription && this.isSensitiveDataAllowed(userRole, userCompanyId, company.id)) {
      baseDto.subscription = {
        id: subscription.id,
        tariffName: subscription.tariff?.name || 'Unknown',
        endDate: subscription.endDate,
        status: subscription.status,
      };
    }

    return baseDto;
  }

  mapToAuditData(company: Company): Partial<Company> {
    return {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  private isSensitiveDataAllowed(
    userRole?: string, 
    userCompanyId?: string, 
    companyId?: string
  ): boolean {
    if (!userRole) {
      return false;
    }

    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN) {
      return true;
    }

    const authorizedRoles: string[] = [
      AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER,
      AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_ADMIN,
    ];

    if (authorizedRoles.includes(userRole) && userCompanyId === companyId) {
      return true;
    }

    return false;
  }

  private getUserAccessLevel(userRole?: string): 'admin' | 'owner' | 'user' | 'public' {
    if (!userRole) return 'public';

    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN) {
      return 'admin';
    }

    const ownerRoles: string[] = [ // ✅ ИСПРАВЛЕНО: Тип string[]
      AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER,
      AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_ADMIN
    ];

    if (ownerRoles.includes(userRole)) {
      return 'owner';
    }

    return 'user';
  }

  mapArrayToResponseDtoOptimized(
    companies: Company[], 
    userRole?: string, 
    userCompanyId?: string
  ): CompanyResponseDto[] {
    const isSensitiveAccessAllowed = this.isSensitiveDataAllowed(userRole, userCompanyId, userCompanyId);
    
    return companies.map(company => {
      const baseResponse: CompanyResponseDto = {
        id: company.id,
        name: company.name,
        legalName: company.legalName,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        logoUrl: company.logoUrl,
        workingHours: company.workingHours as any, // ✅ ИСПРАВЛЕНО: Type assertion
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      };

      if (isSensitiveAccessAllowed && userCompanyId === company.id) {
        baseResponse.taxNumber = company.taxNumber;
      }

      return baseResponse;
    });
  }
}
