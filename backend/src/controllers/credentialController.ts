// src/controllers/credentialController.ts
import { Request, Response, NextFunction } from 'express';
import { credentialService } from '../services/encryptionService'; // or a dedicated credentialService
import { ServicePrincipal } from '../models/ServicePrincipal';
import { AppDataSource } from '../dataSource';

const spRepository = AppDataSource.getRepository(ServicePrincipal);

export const createServicePrincipal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, clientId, clientSecret } = req.body;
    // The user ID could come from req.user if you store it in the token payload
    const userId = (req as any).user.id;

    // Encrypt the clientSecret
    const encryptedSecret = credentialService.encrypt(clientSecret);

    const sp = spRepository.create({
      userId,
      tenantId,
      clientId,
      clientSecret: encryptedSecret,
    });
    await spRepository.save(sp);

    return res.status(201).json({ message: 'Service principal created', spId: sp.id });
  } catch (err) {
    next(err);
  }
};

export const getServicePrincipal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const sp = await spRepository.findOneBy({ userId });
    return res.json(sp || {});
  } catch (err) {
    next(err);
  }
};
