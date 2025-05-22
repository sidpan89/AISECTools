// src/models/Scan.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { CloudCredentials } from './CloudCredentials';
import { ScanPolicy } from './ScanPolicy'; // Added import
import { CloudProvider } from './enums/CloudProvider';

@Entity('Scans')
export class Scan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  credentialId!: number;

  @ManyToOne(() => CloudCredentials)
  @JoinColumn({ name: 'credentialId' })
  credential!: CloudCredentials;

  @Column({ nullable: true }) // policyId is optional
  policyId!: number | null;

  @ManyToOne(() => ScanPolicy, { nullable: true }) // Relation to ScanPolicy
  @JoinColumn({ name: 'policyId' })
  policy!: ScanPolicy | null;

  @Column({
    type: 'enum',
    enum: CloudProvider,
  })
  cloudProvider!: CloudProvider;

  @Column()
  tool!: string; // e.g., "Prowler", "CloudSploit", "GCP-SCC"

  @Column({ type: 'varchar', nullable: true }) // varchar is suitable for string | null
  targetIdentifier!: string | null;

  @Column()
  status!: string; // e.g. "pending", "in_progress", "completed", "failed", "parsing", "archiving_raw_data"

  @Column({ nullable: true })
  // TODO: Re-evaluate or deprecate in favor of the 'tool' column.
  toolsUsed?: string; // e.g. "Prowler,ScoutSuite"

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  startedAt!: Date;

  @UpdateDateColumn()
  completedAt!: Date;

  @ManyToOne(() => User)
  user!: User;
}
