// src/models/Scan.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('Scans')
export class Scan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  status!: string; // e.g. "pending", "in_progress", "completed", "failed"

  @Column({ nullable: true })
  toolsUsed?: string; // e.g. "Prowler,ScoutSuite"

  @CreateDateColumn()
  startedAt!: Date;

  @UpdateDateColumn()
  completedAt!: Date;

  @ManyToOne(() => User)
  user!: User;
}
