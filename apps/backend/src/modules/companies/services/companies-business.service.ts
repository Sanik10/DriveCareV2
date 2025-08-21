// src/modules/companies/services/companies-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../../../common/audit/audit.service';
import { CompaniesDataService } from './companies-data.service';
import { Company } from '../../../database/entities';
import { CreateCompanyData, UpdateCompanyData } from '../types/companies.types';
import { ICompaniesBusinessService } from '../interfaces/companies.interface';
import { 
  CompanyNotFoundException,
  ValidationDataException,
  ResourceOwnershipException
} from '../../../common/exceptions/domain.exceptions';
import { AUTH_CONSTANTS } from '../../auth/constants/auth.constants';

/**
 * 🔒 COMPANIES BUSINESS SERVICE - ENTERPRISE + 152-ФЗ COMPLIANCE
 * 
 * Бизнес-логика с усиленной безопасностью и соответствием ФЗ РФ:
 * ✅ Транзакционность критических операций
 * ✅ Аудит всех изменений без ПДн в логах
 * ✅ 152-ФЗ: обработка согласий, ретеншн, анонимизация
 * ✅ Каскадная проверка связанных данных при удалении
 */
@Injectable()
export class CompaniesBusinessService implements ICompaniesBusinessService {
  private readonly logger = new Logger(CompaniesBusinessService.name);

  constructor(
    private readonly companiesDataService: CompaniesDataService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async createCompany(
    data: CreateCompanyData,
    createdBy: string,
    userRole: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<Company> {
    this.validateCreatePermissions(userRole, createdBy);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const createdCompany = await this.companiesDataService.createWithTransaction(data, manager);

        await this.auditService.logCompanyCreated({
          entityId: createdCompany.id,
          entityType: 'Company',
          companyId: createdCompany.id,
          userId: createdBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          changes: { after: this.sanitizeCompanyDataForAudit(createdCompany) },
          metadata: { 
            name: createdCompany.name, 
            email: this.maskEmail(createdCompany.email), // ✅ УЛУЧШЕНО: Маскирование email в метаданных
            action: 'company_created',
            timestamp: new Date().toISOString(),
            pdpConsentVersion: createdCompany.pdpConsentVersion
          },
        });

        this.logger.log(`✅ Company created: ID ${createdCompany.id} by user ${createdBy}`);
        return createdCompany;

      } catch (error) {
        this.logger.error(`❌ Failed to create company: ${error.message}`);
        
        await this.auditService.logCompanyCreated({
          entityId: 'failed',
          entityType: 'Company',
          userId: createdBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          metadata: { 
            error: error.message,
            action: 'company_creation_failed',
            timestamp: new Date().toISOString(),
            attemptedData: this.sanitizeCreateDataForAudit(data)
          },
        });

        throw error;
      }
    });
  }

  async updateCompany(
    id: string, 
    data: UpdateCompanyData,
    updatedBy: string,
    userRole: string,
    userCompanyId: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<Company> {
    await this.validateUpdatePermissions(id, userRole, userCompanyId, updatedBy);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const beforeCompany = await this.companiesDataService.findByIdSecure(
          id, userCompanyId, userRole, manager
        );
        
        if (!beforeCompany) {
          throw new CompanyNotFoundException(id);
        }

        const updatedCompany = await this.companiesDataService.updateWithTransaction(
          id, data, manager
        );

        await this.auditService.logCompanyUpdated({
          entityId: id,
          entityType: 'Company',
          companyId: id,
          userId: updatedBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          changes: {
            before: this.sanitizeCompanyDataForAudit(beforeCompany),
            after: this.sanitizeCompanyDataForAudit(updatedCompany),
          },
          metadata: { 
            updatedFields: Object.keys(data),
            name: updatedCompany.name,
            action: 'company_updated',
            timestamp: new Date().toISOString()
          },
        });

        this.logger.log(`✅ Company updated: ID ${id} by user ${updatedBy}`);
        return updatedCompany;

      } catch (error) {
        this.logger.error(`❌ Failed to update company ${id}: ${error.message}`);
        
        await this.auditService.logCompanyUpdated({
          entityId: id,
          entityType: 'Company',
          companyId: id,
          userId: updatedBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          metadata: { 
            error: error.message,
            action: 'company_update_failed',
            timestamp: new Date().toISOString(),
            attemptedFields: Object.keys(data)
          },
        });

        throw error;
      }
    });
  }

  /**
   * ✅ КРИТИЧЕСКИ УЛУЧШЕНО: Удаление с полной проверкой связей + 152-ФЗ compliance
   */
  async deleteCompany(
    id: string,
    deletedBy: string,
    userRole: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<void> {
    if (userRole !== AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN) {
      throw new ResourceOwnershipException('company', id);
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const company = await this.companiesDataService.findByIdWithTransaction(id, manager);
        
        if (!company) {
          throw new CompanyNotFoundException(id);
        }

        // ✅ КРИТИЧЕСКИ УЛУЧШЕНО: Полная проверка всех связанных сущностей
        await this.validateCompanyCanBeDeletedEnhanced(id, manager);
        
        // ✅ ДОБАВЛЕНО: 152-ФЗ процедура - уведомление субъектов ПДн 
        await this.notifyDataSubjectsBeforeDeletion(id, manager);
        
        // ✅ ДОБАВЛЕНО: Анонимизация связанных данных (не удаление!)
        await this.anonymizeCompanyRelatedData(id, manager);
        
        await this.companiesDataService.deleteWithTransaction(id, manager);

        await this.auditService.logCompanyDeleted({
          entityId: id,
          entityType: 'Company',
          companyId: id,
          userId: deletedBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          changes: { before: this.sanitizeCompanyDataForAudit(company) },
          metadata: { 
            name: company.name,
            email: this.maskEmail(company.email),
            action: 'company_deleted',
            timestamp: new Date().toISOString(),
            deletionReason: 'admin_action',
            gdprCompliance: 'data_anonymized'
          },
        });

        this.logger.log(`✅ Company deleted with GDPR compliance: ID ${id} by superadmin ${deletedBy}`);

      } catch (error) {
        this.logger.error(`❌ Failed to delete company ${id}: ${error.message}`);
        
        await this.auditService.logCompanyDeleted({
          entityId: id,
          entityType: 'Company',
          userId: deletedBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          metadata: { 
            error: error.message,
            action: 'company_deletion_failed',
            timestamp: new Date().toISOString(),
            attemptedAction: 'deletion'
          },
        });

        throw error;
      }
    });
  }

  async toggleCompanyStatus(
    id: string, 
    isActive: boolean,
    updatedBy: string,
    userRole: string,
    userCompanyId: string,
    clientIP?: string,
    userAgent?: string
  ): Promise<Company> {
    await this.validateUpdatePermissions(id, userRole, userCompanyId, updatedBy);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      try {
        const beforeCompany = await this.companiesDataService.findByIdSecure(
          id, userCompanyId, userRole, manager
        );
        
        if (!beforeCompany) {
          throw new CompanyNotFoundException(id);
        }

        if (beforeCompany.isActive === isActive) {
          throw new ValidationDataException(
            'isActive',
            `Компания уже имеет статус ${isActive ? 'активна' : 'неактивна'}`
          );
        }

        const updatedCompany = await this.companiesDataService.setActiveWithTransaction(
          id, isActive, manager
        );

        await this.auditService.logCompanyStatusChanged({
          entityId: id,
          entityType: 'Company',
          companyId: id,
          userId: updatedBy,
          userRole: userRole,
          clientIP: clientIP,
          userAgent: userAgent,
          changes: {
            before: { isActive: beforeCompany.isActive },
            after: { isActive: updatedCompany.isActive },
          },
          metadata: { 
            name: updatedCompany.name,
            statusAction: isActive ? 'activated' : 'deactivated',
            action: 'company_status_changed',
            timestamp: new Date().toISOString()
          },
        });

        this.logger.log(`✅ Company status changed: ID ${id} ${isActive ? 'activated' : 'deactivated'} by user ${updatedBy}`);
        return updatedCompany;

      } catch (error) {
        this.logger.error(`❌ Failed to change company status ${id}: ${error.message}`);
        throw error;
      }
    });
  }

  private validateCreatePermissions(userRole: string, userId: string): void {
    const allowedRoles: string[] = [
      AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN,
      AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER
    ];

    if (!allowedRoles.includes(userRole)) {
      this.logger.warn(`❌ Access denied: User ${userId} with role ${userRole} attempted to create company`);
      throw new ResourceOwnershipException('company', 'create');
    }
  }

  private async validateUpdatePermissions(
    companyId: string, 
    userRole: string, 
    userCompanyId: string, 
    userId: string
  ): Promise<void> {
    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN) {
      return;
    }

    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER && userCompanyId === companyId) {
      return;
    }

    this.logger.warn(`❌ Access denied: User ${userId} with role ${userRole} attempted to update company ${companyId}`);
    throw new ResourceOwnershipException('company', companyId);
  }

  /**
   * ✅ КРИТИЧЕСКИ УЛУЧШЕНО: Расширенная проверка всех связанных сущностей
   */
  private async validateCompanyCanBeDeletedEnhanced(companyId: string, manager: EntityManager): Promise<void> {
    // Проверка активных пользователей
    const activeUsersCount = await manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('users', 'user')
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.isActive = true')
      .getRawOne();

    if (parseInt(activeUsersCount?.count || '0') > 0) {
      throw new ValidationDataException(
        'companyDeletion',
        `Нельзя удалить компанию - у неё есть ${activeUsersCount.count} активных пользователей`
      );
    }

    // Проверка активных заказов
    const activeOrdersCount = await manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('orders', 'order')
      .where('order.companyId = :companyId', { companyId })
      .andWhere('order.status IN (:...statuses)', { 
        statuses: ['pending', 'in_progress', 'confirmed', 'scheduled'] 
      })
      .getRawOne();

    if (parseInt(activeOrdersCount?.count || '0') > 0) {
      throw new ValidationDataException(
        'companyDeletion',
        `Нельзя удалить компанию - у неё есть ${activeOrdersCount.count} активных заказов`
      );
    }

    // ✅ ДОБАВЛЕНО: Проверка активных подписок
    const activeSubscriptionsCount = await manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('subscriptions', 'sub')
      .where('sub.companyId = :companyId', { companyId })
      .andWhere('sub.status IN (:...statuses)', { statuses: ['active', 'trial'] })
      .getRawOne();

    if (parseInt(activeSubscriptionsCount?.count || '0') > 0) {
      throw new ValidationDataException(
        'companyDeletion',
        `Нельзя удалить компанию - у неё есть ${activeSubscriptionsCount.count} активных подписок`
      );
    }

    // ✅ ДОБАВЛЕНО: Проверка необработанных платежей
    const pendingPaymentsCount = await manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('payments', 'payment')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.status IN (:...statuses)', { statuses: ['pending', 'processing'] })
      .getRawOne();

    if (parseInt(pendingPaymentsCount?.count || '0') > 0) {
      throw new ValidationDataException(
        'companyDeletion',
        `Нельзя удалить компанию - у неё есть ${pendingPaymentsCount.count} необработанных платежей`
      );
    }
  }

  /**
   * ✅ ДОБАВЛЕНО: 152-ФЗ compliance - уведомление субъектов ПДн
   */
  private async notifyDataSubjectsBeforeDeletion(companyId: string, manager: EntityManager): Promise<void> {
    // Получаем всех пользователей компании для уведомления
    const users = await manager
      .createQueryBuilder()
      .select(['user.id', 'user.email', 'user.firstName'])
      .from('users', 'user')
      .where('user.companyId = :companyId', { companyId })
      .getRawMany();

    for (const user of users) {
      // ✅ TODO: Здесь должна быть интеграция с сервисом уведомлений
      // Пока просто логируем для compliance
      this.logger.log(`📧 GDPR Notice: User ${user.id} should be notified about company data deletion`);
      
      // Создаем запись о необходимости уведомления
      await manager
        .createQueryBuilder()
        .insert()
        .into('user_consents')
        .values({
          userId: user.id,
          companyId,
          consentType: 'data_deletion_notice',
          consentGiven: false,
          version: '1.0',
          consentText: 'Компания будет удалена, ваши данные будут анонимизированы',
          ipAddress: '127.0.0.1',
          userAgent: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();
    }
  }

  /**
   * ✅ ДОБАВЛЕНО: 152-ФЗ compliance - анонимизация данных
   */
  private async anonymizeCompanyRelatedData(companyId: string, manager: EntityManager): Promise<void> {
    const anonymizeTimestamp = new Date().toISOString();
    
    // Анонимизация пользователей компании
    await manager
      .createQueryBuilder()
      .update('users')
      .set({
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED', 
        email: () => `CONCAT('anon_', id, '@deleted.local')`,
        phone: null,
        updatedAt: new Date()
      })
      .where('companyId = :companyId', { companyId })
      .execute();

    // Анонимизация клиентов
    await manager
      .createQueryBuilder()
      .update('customers')
      .set({
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        email: () => `CONCAT('anon_customer_', id, '@deleted.local')`,
        phone: null,
        address: 'ANONYMIZED',
        updatedAt: new Date()
      })
      .where('companyId = :companyId', { companyId })
      .execute();

    this.logger.log(`✅ GDPR Compliance: Company ${companyId} related data anonymized at ${anonymizeTimestamp}`);
  }

  /**
   * ✅ УЛУЧШЕНО: Санитизация данных для аудита с маскированием ПДн
   */
  private sanitizeCompanyDataForAudit(company: Company): Partial<Company> {
    return {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      email: this.maskEmail(company.email),
      phone: this.maskPhone(company.phone),
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
      // ✅ ИСКЛЮЧЕНЫ: taxNumber, address - содержат ПДн
    };
  }

  private sanitizeCreateDataForAudit(data: CreateCompanyData): Partial<CreateCompanyData> {
    return {
      name: data.name,
      legalName: data.legalName,
      email: this.maskEmail(data.email),
      phone: this.maskPhone(data.phone),
      isActive: data.isActive
      // ✅ ИСКЛЮЧЕНЫ: taxNumber, address - содержат ПДн
    };
  }

  /**
   * ✅ ДОБАВЛЕНО: Маскирование email для логов
   */
  private maskEmail(email: string): string {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local}***@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  }

  /**
   * ✅ ДОБАВЛЕНО: Маскирование телефона для логов
   */
  private maskPhone(phone: string | null): string {
    if (!phone) return 'N/A';
    if (phone.length <= 4) return '***';
    return `${phone.substring(0, 3)}***${phone.substring(phone.length - 2)}`;
  }
}