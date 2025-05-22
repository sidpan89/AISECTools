// backend/src/models/ScheduledScan.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './User';
import { CloudCredentials } from './CloudCredentials';
import { ScanPolicy } from './ScanPolicy';

@Entity('ScheduledScans')
@Index(['userId', 'name'], { unique: true })
export class ScheduledScan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User)
  user!: User;

  @Column()
  name!: string; // User-defined name for the scheduled scan (e.g., "Daily AWS Prowler CIS")

  @Column({ nullable: true })
  description?: string;

  @Column()
  credentialId!: number;

  @ManyToOne(() => CloudCredentials)
  credential!: CloudCredentials;

  @Column()
  toolName!: string; // e.g., "Prowler", "CloudSploit", "GCP-SCC"

  @Column({ type: 'text', nullable: true })
  targetIdentifier?: string | null; // e.g., GCP Project ID, AWS Account ID, Azure Subscription ID

  @Column({ type: 'int', nullable: true })
  policyId?: number | null;

  @ManyToOne(() => ScanPolicy, { nullable: true }) // A scheduled scan might not have a policy (uses default tool behavior)
  policy?: ScanPolicy | null;

  @Column() // Stores the cron expression, e.g., "0 2 * * *" (every day at 2 AM)
  cronExpression!: string;

  @Column({ default: true })
  isEnabled!: boolean; // To easily enable/disable a scheduled scan

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastRunAt?: Date | null; // Timestamp of the last time this job was triggered

  @Column({ type: 'timestamp with time zone', nullable: true })
  nextRunAt?: Date | null; // Calculated next run time (useful for display, can be updated by scheduler)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
