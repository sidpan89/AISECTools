// src/services/scanService.ts
import { exec } from 'child_process';
import { AppDataSource } from '../dataSource';
import { Scan } from '../models/Scan';
import { Findings } from '../models/Findings';
import { ServicePrincipal } from '../models/ServicePrincipal';
import { credentialService } from './encryptionService';

const scanRepository = AppDataSource.getRepository(Scan);
const findingsRepository = AppDataSource.getRepository(Findings);
const spRepository = AppDataSource.getRepository(ServicePrincipal);

export const scanService = {
  async getScansForUser(userId: number) {
    return await scanRepository.find({ where: { userId } });
  },

  async startScan(userId: number, tools: string[]) {
    // 1. Create a new scan record
    const scan = scanRepository.create({ userId, status: 'pending', toolsUsed: tools.join(',') });
    await scanRepository.save(scan);

    // 2. Retrieve user's service principal
    const sp = await spRepository.findOneBy({ userId });
    if (!sp) throw new Error('No service principal found for user');

    // 3. Decrypt clientSecret
    const clientSecret = credentialService.decrypt(sp.clientSecret);

    // 4. Execute scanning in background (simplified example)
    tools.forEach((tool) => {
      if (tool === 'Prowler') {
        // e.g. exec('prowler ...', callback)
      }
      if (tool === 'ScoutSuite') {
        // e.g. exec('scout_suite ...', callback)
      }
    });

    // Mark scan in progress...
    scan.status = 'in_progress';
    await scanRepository.save(scan);

    // Return the updated scan
    return scan;
  },

  async getFindingsForScan(userId: number, scanId: number) {
    // Check if scan belongs to user
    const scan = await scanRepository.findOneBy({ id: scanId, userId });
    if (!scan) throw new Error('Scan not found or not authorized');

    return await findingsRepository.find({ where: { scanId } });
  },

  // Potentially more methods to process scanner output, parse JSON, etc.
};
