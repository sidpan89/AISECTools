// src/controllers/credentialController.ts
import { Request, Response, NextFunction } from 'express';
import { credentialService } from '../services/encryptionService';
import logger from '../utils/logger'; // Added import
import { CloudCredentials } from '../models/CloudCredentials';
import { CloudProvider } from '../models/enums/CloudProvider'; // Import CloudProvider
import { AppDataSource } from '../dataSource';

const cloudCredentialsRepository = AppDataSource.getRepository(CloudCredentials);

export const createCloudCredential = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, name, credentials } = req.body; // credentials is a JS object
    const userId = (req as any).user.id;

    // Validate provider
    if (!Object.values(CloudProvider).includes(provider)) {
      return res.status(400).json({ message: 'Invalid cloud provider specified.' });
    }

    // Stringify the credentials object
    const stringifiedCredentials = JSON.stringify(credentials);
    // Encrypt the entire JSON string
    const encryptedJsonCredentials = credentialService.encrypt(stringifiedCredentials);
    
    const newCredential = cloudCredentialsRepository.create({
      userId,
      provider,
      name,
      encryptedCredentials: encryptedJsonCredentials,
    });
    await cloudCredentialsRepository.save(newCredential);
    logger.info('Cloud credential created', { userId: (req as any).user.id, credentialId: newCredential.id, provider: newCredential.provider, path: req.path, method: req.method });
    return res.status(201).json({ message: 'Cloud credential created', credentialId: newCredential.id });
  } catch (err) {
    logger.error('Failed to create cloud credential', { 
      userId: (req as any).user?.id, 
      provider: req.body.provider,
      name: req.body.name,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const getCloudCredentials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const credentialsList = await cloudCredentialsRepository.find({ where: { userId } });
    // Optional: Log successful retrieval, but be mindful of data volume if logs are verbose
    // logger.info('Retrieved cloud credentials for user', { userId, count: credentialsList.length, path: req.path, method: req.method });

    const sanitizedCredentials = credentialsList.map(cred => {
      const decryptedStringifiedCredentials = credentialService.decrypt(cred.encryptedCredentials);
      const parsedCredentials = JSON.parse(decryptedStringifiedCredentials);

      // Sanitize sensitive fields
      // This is a basic example; you'll need to expand based on provider-specific sensitive fields
      if (parsedCredentials.clientSecret) parsedCredentials.clientSecret = '********';
      if (parsedCredentials.secretAccessKey) parsedCredentials.secretAccessKey = '********';
      if (parsedCredentials.private_key) parsedCredentials.private_key = '********';
      // Add more sanitization for other potential sensitive fields (e.g., API keys, tokens)

      return {
        id: cred.id,
        userId: cred.userId,
        provider: cred.provider,
        name: cred.name,
        credentials: parsedCredentials, // Send the sanitized object
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
      };
    });

    return res.json(sanitizedCredentials);
  } catch (err) {
    logger.error('Failed to get cloud credentials', { 
      userId: (req as any).user?.id, 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const deleteCloudCredential = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const credentialId = parseInt(req.params.credentialId, 10);

    const result = await cloudCredentialsRepository.delete({ id: credentialId, userId });

    if (result.affected === 0) {
      // Log this specific case as a warning or info, as it's a client error (not found) rather than server error
      logger.warn('Cloud credential not found for deletion or user not authorized', { userId, credentialId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Credential not found or not authorized to delete.' });
    }
    logger.info('Cloud credential deleted successfully', { userId, credentialId, path: req.path, method: req.method });
    return res.status(200).json({ message: 'Credential deleted successfully.' }); // Changed from 204 to 200 to allow message
  } catch (err) {
    logger.error('Failed to delete cloud credential', { 
      userId: (req as any).user?.id, 
      credentialId: req.params.credentialId,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};
