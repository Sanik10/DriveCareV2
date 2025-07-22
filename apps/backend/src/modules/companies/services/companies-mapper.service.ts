import { Injectable } from '@nestjs/common';
import { Company } from '../../../database/entities';
import { CompanyResponseDto } from '../dto/response/company-response.dto';

@Injectable()
export class CompaniesMapperService {
  
  /**
   * Основной маппинг Entity → ResponseDto
   */
  mapToResponseDto(company: Company): CompanyResponseDto {
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
      workingHours: company.workingHours,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      // subscription будет добавлена в следующих этапах
    };
  }

  /**
   * Маппинг для списков (массив Entity → массив ResponseDto)
   */
  mapArrayToResponseDto(companies: Company[]): CompanyResponseDto[] {
    return companies.map(company => this.mapToResponseDto(company));
  }

  /**
   * Базовая информация о компании (для других модулей)
   */
  mapToBasicInfo(company: Company): { 
    id: string; 
    name: string; 
    email: string; 
    isActive: boolean;
  } {
    return {
      id: company.id,
      name: company.name,
      email: company.email,
      isActive: company.isActive,
    };
  }

  /**
   * Расширенная информация о компании (для интеграций)
   */
  mapToExtendedInfo(company: Company): {
    id: string;
    name: string;
    legalName: string;
    email: string;
    phone?: string;
    address?: string;
    isActive: boolean;
    createdAt: Date;
  } {
    return {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      isActive: company.isActive,
      createdAt: company.createdAt,
    };
  }

  /**
   * Маппинг для выпадающих списков (ID + название)
   */
  mapToSelectOption(company: Company): { value: string; label: string; disabled?: boolean } {
    return {
      value: company.id,
      label: company.name,
      disabled: !company.isActive,
    };
  }

  /**
   * 🔥 НОВОЕ: Маппинг с информацией о подписке (для будущего использования)
   */
  mapToResponseDtoWithSubscription(
    company: Company, 
    subscription?: any // SubscriptionResponseDto в будущем
  ): CompanyResponseDto {
    const baseDto = this.mapToResponseDto(company);
    
    if (subscription) {
      baseDto.subscription = {
        id: subscription.id,
        tariffName: subscription.tariff?.name || 'Unknown',
        endDate: subscription.endDate,
        status: subscription.status,
      };
    }

    return baseDto;
  }
}
