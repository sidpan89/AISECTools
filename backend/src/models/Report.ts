// src/models/Report.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Scan } from './Scan';

@Entity('Reports')
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  scanId!: number;

  @Column()
  format!: string; // e.g. "PDF", "HTML"

  @CreateDateColumn()
  generatedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  summaryMetrics?: any;

  @ManyToOne(() => Scan)
  scan!: Scan;
}
