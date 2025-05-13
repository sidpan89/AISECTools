// src/models/Findings.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Scan } from './Scan';

@Entity('Findings')
export class Findings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  scanId!: number;

  @Column()
  severity!: string; // e.g. "Critical", "High", "Medium", "Low"

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  resource?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  recommendation?: string;

  @ManyToOne(() => Scan)
  scan!: Scan;
}
