import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Part } from './part.entity';

@Entity('inventory_alerts')
export class InventoryAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ type: 'integer', default: 0 })
  minQuantity: number;

  @Column({ type: 'boolean', default: true })
  alertEnabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  alertEmails: string[] | null;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationDate: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}