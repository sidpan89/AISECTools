// DEPRECATED: This model will be replaced by CloudCredentials.ts
// src/models/ServicePrincipal.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('ServicePrincipals')
export class ServicePrincipal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  tenantId!: string;

  @Column()
  clientId!: string;

  @Column()
  clientSecret!: string; // stored encrypted

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Example relationship
  @ManyToOne(() => User)
  user!: User;
}
