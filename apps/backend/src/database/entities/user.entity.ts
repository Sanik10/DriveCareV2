import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })  // Добавлен тип uuid
  company_id: string;

  @Column({ nullable: false, type: 'varchar', length: 255 })  // Добавлен тип varchar с длиной
  email: string;

  @Column({ nullable: false, type: 'varchar', length: 255 })  // Добавлен тип varchar с длиной
  password_hash: string;

  @Column({ name: 'first_name', nullable: false, type: 'varchar', length: 100 })  // Добавлен тип varchar с длиной
  firstName: string;

  @Column({ name: 'last_name', nullable: false, type: 'varchar', length: 100 })  // Добавлен тип varchar с длиной
  lastName: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })  // Добавлен тип varchar с длиной
  phone: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar', length: 255 })  // Добавлен тип varchar с длиной
  avatarUrl: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })  // Добавлен тип varchar с длиной
  specialization: string;

  @Column({ name: 'is_active', default: true, type: 'boolean' })  // Добавлен тип boolean
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamp' })  // Добавлен тип timestamp
  lastLoginAt: Date;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id', type: 'uuid' })  // Добавлен тип uuid
  roleId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })  // Добавлен тип timestamp
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })  // Добавлен тип timestamp
  updatedAt: Date;
}