// backend/src/models/CloudCredentials.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './User';
import { CloudProvider } from './enums/CloudProvider';

@Entity('CloudCredentials')
@Index(['userId', 'name'], { unique: true }) // Ensure a user cannot have multiple credentials with the same name
export class CloudCredentials {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User)
  user!: User;

  @Column({
    type: 'enum',
    enum: CloudProvider,
  })
  provider!: CloudProvider;

  @Column()
  name!: string; // User-defined name for the credential set

  // Store provider-specific credentials.
  // Sensitive parts (e.g., secrets, keys) within this JSON blob WILL BE ENCRYPTED before saving.
  // The structure will vary by provider.
  // For Azure: { tenantId: string, clientId: string, clientSecret: string }
  // For AWS: { accessKeyId: string, secretAccessKey: string, sessionToken?: string, region: string }
  // For GCP: { type: string, project_id: string, private_key_id: string, private_key: string, ... } (standard service account JSON)
  @Column({ type: 'text' }) // Store as encrypted JSON string
  encryptedCredentials!: string; 

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
