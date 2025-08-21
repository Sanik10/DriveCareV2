// path: apps/backend/src/modules/inventory/parts/services/parts-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Part, PartCategory, Company } from '../../../../database/entities';
import { PartFilter, CreatePartData, UpdatePartData } from '../types/parts.types';
import { PARTS_CONSTANTS } from '../constants/parts.constants';

@Injectable()
export class PartsDataService {
  constructor(
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(PartCategory)
    private readonly partCategoryRepository: Repository<PartCategory>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findWithFilters(filter: PartFilter): Promise<[Part[], number]> {
    const query = this.partRepository.createQueryBuilder('part').leftJoinAndSelect('part.category', 'category');

    if (filter.companyId) {
      query.andWhere('part.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    if (filter.brand) {
      query.andWhere('part.brand ILIKE :brand', { brand: `%${filter.brand}%` });
    }

    if (filter.isActive !== undefined) {
      query.andWhere('part.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.search && filter.search.length >= PARTS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
      query.andWhere(
        '(part.name ILIKE :search OR part.partNumber ILIKE :search OR part.brand ILIKE :search OR part.description ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter.minCostPrice !== undefined) {
      query.andWhere('part.costPrice >= :minCostPrice', { minCostPrice: filter.minCostPrice });
    }

    if (filter.maxCostPrice !== undefined) {
      query.andWhere('part.costPrice <= :maxCostPrice', { maxCostPrice: filter.maxCostPrice });
    }

    if (filter.minSellingPrice !== undefined) {
      query.andWhere('part.sellingPrice >= :minSellingPrice', { minSellingPrice: filter.minSellingPrice });
    }

    if (filter.maxSellingPrice !== undefined) {
      query.andWhere('part.sellingPrice <= :maxSellingPrice', { maxSellingPrice: filter.maxSellingPrice });
    }

    if (filter.createdFrom) {
      query.andWhere('part.createdAt >= :createdFrom', { createdFrom: filter.createdFrom });
    }

    if (filter.createdTo) {
      query.andWhere('part.createdAt <= :createdTo', { createdTo: filter.createdTo });
    }

    const sortField = filter.sortField || 'createdAt';
    const sortOrder = (filter.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

    switch (sortField) {
      case 'name':
        query.orderBy('part.name', sortOrder);
        break;
      case 'partNumber':
        query.orderBy('part.partNumber', sortOrder);
        break;
      case 'brand':
        query.orderBy('part.brand', sortOrder);
        break;
      case 'costPrice':
        query.orderBy('part.costPrice', sortOrder);
        break;
      case 'sellingPrice':
        query.orderBy('part.sellingPrice', sortOrder);
        break;
      case 'category':
        query.orderBy('category.name', sortOrder);
        break;
      case 'createdAt':
      default:
        query.orderBy('part.createdAt', sortOrder);
    }

    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  async findById(id: string): Promise<Part | null> {
    return this.partRepository.findOne({ where: { id }, relations: ['category'] });
  }

  async findByIdAndCompany(id: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { id, companyId },
      relations: ['category'],
    });
  }

  async create(data: CreatePartData): Promise<Part> {
    const part = this.partRepository.create(data);
    return this.partRepository.save(part);
  }

  async update(id: string, data: UpdatePartData): Promise<Part> {
    await this.partRepository.update(id, data);
    const updatedPart = await this.findById(id);
    if (!updatedPart) {
      throw new Error(`Part with id ${id} not found after update`);
    }
    return updatedPart;
  }

  async softDelete(id: string): Promise<void> {
    await this.partRepository.update(id, { isActive: false });
  }

  async hardDelete(id: string): Promise<void> {
    await this.partRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<Part> {
    await this.partRepository.update(id, { isActive });
    const updatedPart = await this.findById(id);
    if (!updatedPart) {
      throw new Error(`Part with id ${id} not found after status update`);
    }
    return updatedPart;
  }

  async findByPartNumber(partNumber: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { partNumber, companyId },
      relations: ['category'],
    });
  }

  async getCompanyPartsStats(companyId: string): Promise<{
    totalActive: number;
    totalInactive: number;
    averageCostPrice: number;
    averageSellingPrice: number;
    totalInventoryValue: number;
  }> {
    const [totalActive, totalInactive, priceStats] = await Promise.all([
      this.partRepository.count({ where: { companyId, isActive: true } }),
      this.partRepository.count({ where: { companyId, isActive: false } }),
      this.partRepository
        .createQueryBuilder('part')
        .select(['AVG(part.costPrice) as avgCostPrice', 'AVG(part.sellingPrice) as avgSellingPrice', 'SUM(part.costPrice) as totalInventoryValue'])
        .where('part.companyId = :companyId', { companyId })
        .andWhere('part.isActive = true')
        .getRawOne(),
    ]);

    return {
      totalActive,
      totalInactive,
      averageCostPrice: parseFloat(priceStats.avgcostprice) || 0,
      averageSellingPrice: parseFloat(priceStats.avgsellingprice) || 0,
      totalInventoryValue: parseFloat(priceStats.totalinventoryvalue) || 0,
    };
  }

  async getCategoriesStats(companyId: string): Promise<
    Array<{
      categoryId: string;
      categoryName: string;
      count: number;
    }>
  > {
    const result = await this.partRepository
      .createQueryBuilder('part')
      .leftJoin('part.category', 'category')
      .select(['category.id as categoryId', 'category.name as categoryName', 'COUNT(*) as count'])
      .where('part.companyId = :companyId', { companyId })
      .andWhere('part.isActive = true')
      .groupBy('category.id, category.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((item) => ({
      categoryId: item.categoryid,
      categoryName: item.categoryname || 'Без категории',
      count: parseInt(item.count, 10),
    }));
  }

  async validateCategoryExists(categoryId: string, companyId?: string): Promise<boolean> {
    if (!companyId) {
      const count = await this.partCategoryRepository.count({ where: { id: categoryId } });
      return count > 0;
    }
    const count = await this.partCategoryRepository
      .createQueryBuilder('c')
      .where('c.id = :id', { id: categoryId })
      .andWhere('(c.companyId = :companyId OR c.companyId IS NULL)', { companyId })
      .getCount();
    return count > 0;
  }

  async validateCompanyExists(companyId: string): Promise<boolean> {
    const count = await this.companyRepository.count({ where: { id: companyId } });
    return count > 0;
  }

  async findMultipleByIds(partIds: string[], companyId: string): Promise<Part[]> {
    if (partIds.length === 0) return [];
    return this.partRepository.find({
      where: { id: In(partIds), companyId },
      relations: ['category'],
    });
  }

  async bulkUpdate(partIds: string[], updateData: UpdatePartData, companyId: string): Promise<number> {
    const result = await this.partRepository
      .createQueryBuilder()
      .update(Part)
      .set(updateData)
      .where('id IN (:...partIds)', { partIds })
      .andWhere('companyId = :companyId', { companyId })
      .execute();

    return result.affected || 0;
  }

  async advancedSearch(searchTerm: string, companyId: string, limit: number = 10): Promise<Part[]> {
    return this.partRepository
      .createQueryBuilder('part')
      .leftJoinAndSelect('part.category', 'category')
      .where('part.companyId = :companyId', { companyId })
      .andWhere('part.isActive = true')
      .andWhere(
        `(
          part.name ILIKE :search OR 
          part.partNumber ILIKE :search OR 
          part.brand ILIKE :search OR 
          part.description ILIKE :search OR
          category.name ILIKE :search
        )`,
        { search: `%${searchTerm}%` },
      )
      .orderBy(
        `CASE 
          WHEN part.name ILIKE :exactSearch THEN 1
          WHEN part.partNumber ILIKE :exactSearch THEN 2
          WHEN part.brand ILIKE :exactSearch THEN 3
          ELSE 4
        END`,
        'ASC',
      )
      .setParameter('exactSearch', `${searchTerm}%`)
      .limit(limit)
      .getMany();
  }

  async getPopularParts(companyId: string, limit: number = 20): Promise<Part[]> {
    return this.partRepository.find({
      where: { companyId, isActive: true },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPriceExtremes(companyId: string): Promise<{
    mostExpensive: Part | null;
    cheapest: Part | null;
  }> {
    const [mostExpensive, cheapest] = await Promise.all([
      this.partRepository.findOne({ where: { companyId, isActive: true }, relations: ['category'], order: { costPrice: 'DESC' } }),
      this.partRepository.findOne({ where: { companyId, isActive: true }, relations: ['category'], order: { costPrice: 'ASC' } }),
    ]);
    return { mostExpensive, cheapest };
  }
}
