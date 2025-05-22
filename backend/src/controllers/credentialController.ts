// src/controllers/credentialController.ts
import { Request, Response, NextFunction } from 'express';
import { credentialService } from '../services/encryptionService';
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

    return res.status(201).json({ message: 'Cloud credential created', credentialId: newCredential.id });
  } catch (err) {
    next(err);
  }
};

export const getCloudCredentials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const credentialsList = await cloudCredentialsRepository.find({ where: { userId } });

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
    next(err);
  }
};

export const deleteCloudCredential = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const credentialId = parseInt(req.params.credentialId, 10);

    const result = await cloudCredentialsRepository.delete({ id: credentialId, userId });

    if (result.affected === 0) {
      return res.status(404).json({ message: 'Credential not found or not authorized to delete.' });
    }

    return res.status(200).json({ message: 'Credential deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
