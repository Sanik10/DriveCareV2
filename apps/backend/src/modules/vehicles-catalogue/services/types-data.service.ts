import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from '../../../database/entities/vehicle-type.entity';
import { TypeFilter, CreateTypeData, UpdateTypeData } from '../types/catalogue.types';
import { ITypesDataService } from '../interfaces/catalogue.interface';

@Injectable()
export class TypesDataService implements ITypesDataService {
  constructor(
    @InjectRepository(VehicleType)
    private readonly typesRepository: Repository<VehicleType>,
  ) {}

  async create(data: CreateTypeData): Promise<VehicleType> {
    const type = this.typesRepository.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    return this.typesRepository.save(type);
  }

  async findAll(): Promise<VehicleType[]> {
    return this.typesRepository.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<VehicleType | null> {
    return this.typesRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['vehicles'],
    });
  }

  async findByName(name: string): Promise<VehicleType | null> {
    return this.typesRepository.findOne({
      where: { name, isDeleted: false },
    });
  }

  async findWithFilters(filter: TypeFilter): Promise<VehicleType[]> {
    const {
      search,
      isActive,
      includeDeleted = false
    } = filter;

    const query = this.typesRepository.createQueryBuilder('type')
      .leftJoinAndSelect('type.vehicles', 'vehicle', 'vehicle.isDeleted = false');

    if (!includeDeleted) {
      query.andWhere('type.isDeleted = false');
    }

    if (search) {
      query.andWhere(
        '(type.name ILIKE :search OR type.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (isActive !== undefined) {
      query.andWhere('type.isActive = :isActive', { isActive });
    }

    query.orderBy('type.name', 'ASC');

    return query.getMany();
  }

  async update(id: string, data: UpdateTypeData): Promise<VehicleType> {
    const updateData: Partial<VehicleType> = {};
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    });

    await this.typesRepository.update(id, updateData);
    
    const updatedType = await this.findById(id);
    if (!updatedType) {
      throw new Error(`Type with id ${id} not found after update`);
    }
    
    return updatedType;
  }

  async softDelete(id: string): Promise<void> {
    await this.typesRepository.update(id, { 
      isDeleted: true, 
      deletedAt: new Date() 
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.typesRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<VehicleType> {
    await this.typesRepository.update(id, { isActive });
    
    const updatedType = await this.findById(id);
    if (!updatedType) {
      throw new Error(`Type with id ${id} not found after status update`);
    }
    
    return updatedType;
  }

  async countVehicles(typeId: string): Promise<number> {
    const result = await this.typesRepository
      .createQueryBuilder('type')
      .leftJoin('type.vehicles', 'vehicle')
      .select('COUNT(vehicle.id)', 'count')
      .where('type.id = :typeId', { typeId })
      .andWhere('vehicle.isDeleted = false')
      .getRawOne();

    return parseInt(result.count) || 0;
  }
}
