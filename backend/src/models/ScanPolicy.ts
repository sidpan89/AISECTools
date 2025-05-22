// backend/src/models/ScanPolicy.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './User';
import { CloudProvider } from './enums/CloudProvider';

@Entity('ScanPolicies')
@Index(['userId', 'name'], { unique: true }) // User cannot have multiple policies with the same name
export class ScanPolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User)
  user!: User;

  @Column()
  name!: string; // User-defined name for the policy (e.g., "My CIS Benchmark for AWS Prowler")

  @Column({
    type: 'enum',
    enum: CloudProvider,
  })
  provider!: CloudProvider; // e.g., AWS, Azure, GCP

  @Column()
  tool!: string; // e.g., "Prowler", "CloudSploit". Should match IScanner.toolName

  @Column({ type: 'text', nullable: true })
  description?: string; // Optional description of the policy

  // Policy definition: Stores tool-specific rules.
  // For Prowler: could be list of checks, groups, compliance frameworks.
  // e.g., { checks: ['iam_user_mfa_enabled'], excluded_checks: ['s3_bucket_public_access'], compliance: 'cis_level_1' }
  // For CloudSploit: could be list of plugins to run or skip.
  // e.g., { plugins: ['acmValidation', 'iamUsersMFA'], skip_plugins: ['cloudfrontLogging'] }
  @Column({ type: 'jsonb', nullable: true }) // Using JSONB for flexibility and queryability if needed
  definition?: any; 
  // Example 'definition' structure for Prowler:
  // {
  //   checks?: string[]; // Specific check IDs to run
  //   excludedChecks?: string[]; // Specific check IDs to exclude
  //   services?: string[]; // Specific services to scan
  //   complianceFrameworks?: string[]; // e.g., ["cis_aws_foundations_benchmark_v1_5_0"]
  //   severityThreshold?: string; // e.g., "High" - only report findings above this
  //   customArgs?: string; // Any other raw CLI args for the tool
  // }


  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
