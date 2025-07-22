import { Injectable, Logger } from '@nestjs/common';
import { CompaniesDataService } from './services/companies-data.service';
import { CompaniesBusinessService } from './services/companies-business.service';
import { CompaniesValidationService } from './services/companies-validation.service';
import { CompaniesMapperService } from './services/companies-mapper.service'; // 🔥 ДОБАВЛЕНО
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { CompanyResponseDto } from './dto/response/company-response.dto';
import { PaginatedCompaniesResponseDto } from './dto/response/paginated-companies-response.dto';
import { CompanyFilter } from './types/companies.types';
import { COMPANIES_CONSTANTS } from './constants/companies.constants';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly companiesDataService: CompaniesDataService,
    private readonly companiesBusinessService: CompaniesBusinessService,
    private readonly companiesValidationService: CompaniesValidationService,
    private readonly companiesMapperService: CompaniesMapperService, // 🔥 ДОБАВЛЕНО
  ) {}

  /**
   * Создание новой компании
   */
  async create(createCompanyDto: CreateCompanyDto): Promise<CompanyResponseDto> {
    this.logger.log(`Создание новой компании: ${createCompanyDto.name}`);

    // Валидация данных
    await this.companiesValidationService.validateCreateData(createCompanyDto);

    // Создание через бизнес-сервис
    const company = await this.companiesBusinessService.createCompany(createCompanyDto);

    this.logger.log(`Компания успешно создана: ${company.name} (${company.id})`);

    return this.companiesMapperService.mapToResponseDto(company); // 🔥 ИЗМЕНЕНО
  }

  /**
   * Получение всех компаний с фильтрацией и пагинацией
   */
  async findAll(filter: CompanyFilter = {}): Promise<PaginatedCompaniesResponseDto> {
    this.logger.log(`Поиск компаний с фильтрами: ${JSON.stringify(filter)}`);

    const [companies, total] = await this.companiesDataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || COMPANIES_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    return {
      items: this.companiesMapperService.mapArrayToResponseDto(companies), // 🔥 ИЗМЕНЕНО
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Получение компании по ID
   */
  async findOne(id: string): Promise<CompanyResponseDto> {
    this.logger.log(`Поиск компании по ID: ${id}`);

    const company = await this.companiesValidationService.validateCompanyExists(id);

    // TODO: Добавить информацию о подписке когда будет готов SubscriptionsService
    // const subscription = await this.subscriptionsService.findActiveByCompany(id);
    
    return this.companiesMapperService.mapToResponseDto(company); // 🔥 ИЗМЕНЕНО
  }

  /**
   * Обновление компании
   */
  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    this.logger.log(`Обновление компании: ${id}`);

    // Валидация данных
    await this.companiesValidationService.validateUpdateData(id, updateCompanyDto);

    // Обновление через бизнес-сервис
    const updatedCompany = await this.companiesBusinessService.updateCompany(id, updateCompanyDto);

    this.logger.log(`Компания успешно обновлена: ${updatedCompany.name} (${id})`);

    return this.companiesMapperService.mapToResponseDto(updatedCompany); // 🔥 ИЗМЕНЕНО
  }

  /**
   * Удаление компании (только для superadmin)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Удаление компании: ${id}`);

    // Проверяем существование компании
    await this.companiesValidationService.validateCompanyExists(id);

    // Удаление через бизнес-сервис
    await this.companiesBusinessService.deleteCompany(id);

    this.logger.log(`Компания успешно удалена: ${id}`);
  }

  /**
   * Изменение статуса активности компании
   */
  async setActive(id: string, isActive: boolean): Promise<CompanyResponseDto> {
    this.logger.log(`Изменение статуса компании ${id} на ${isActive ? 'активна' : 'неактивна'}`);

    // Изменение статуса через бизнес-сервис
    const updatedCompany = await this.companiesBusinessService.toggleCompanyStatus(id, isActive);

    this.logger.log(`Статус компании ${id} успешно изменен на ${isActive ? 'активна' : 'неактивна'}`);

    return this.companiesMapperService.mapToResponseDto(updatedCompany); // 🔥 ИЗМЕНЕНО
  }

  /**
   * Поиск компании по email (для внутреннего использования)
   */
  async findByEmail(email: string): Promise<CompanyResponseDto | null> {
    const company = await this.companiesDataService.findByEmail(email);
    return company ? this.companiesMapperService.mapToResponseDto(company) : null; // 🔥 ИЗМЕНЕНО
  }

  /**
   * Проверка существования компании (для других модулей)
   */
  async exists(id: string): Promise<boolean> {
    const company = await this.companiesDataService.findById(id);
    return !!company;
  }

  /**
   * Получение базовой информации о компании (для других модулей)
   */
  async getCompanyInfo(id: string): Promise<{ id: string; name: string; email: string; isActive: boolean } | null> {
    const company = await this.companiesDataService.findById(id);
    return company ? this.companiesMapperService.mapToBasicInfo(company) : null; // 🔥 ИЗМЕНЕНО
  }

  // 🔥 УДАЛЕНО: Старый метод mapToResponseDto - теперь используется Mapper сервис
}
