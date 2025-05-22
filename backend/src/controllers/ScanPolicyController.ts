// backend/src/controllers/ScanPolicyController.ts
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../dataSource';
import logger from '../utils/logger'; // Added import
import { ScanPolicy } from '../models/ScanPolicy';
import { User } from '../models/User'; // For type safety if needed, though userId from req.user

const policyRepository = AppDataSource.getRepository(ScanPolicy);

export const createScanPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { name, provider, tool, description, definition } = req.body;

    if (!name || !provider || !tool) {
      logger.warn('Missing required fields for createScanPolicy', { userId, body: req.body, path: req.path, method: req.method });
      return res.status(400).json({ message: 'Missing required fields: name, provider, tool' });
    }
    
    // Optional: Validate 'definition' structure based on 'tool' if needed here, or rely on frontend/scanner.

    const existingPolicy = await policyRepository.findOneBy({ userId, name });
    if (existingPolicy) {
        logger.warn('Attempt to create scan policy with duplicate name', { userId, name: req.body.name, path: req.path, method: req.method });
        return res.status(400).json({ message: `A policy with the name '${name}' already exists.`});
    }

    const policy = policyRepository.create({
      userId,
      name,
      provider,
      tool,
      description,
      definition,
    });
    await policyRepository.save(policy);
    logger.info('Scan policy created', { userId, policyId: policy.id, name: policy.name, path: req.path, method: req.method });
    return res.status(201).json(policy);
  } catch (err) {
    logger.error('Failed to create scan policy', { 
      userId: (req as any).user?.id, 
      body: req.body, 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const getScanPoliciesByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const policies = await policyRepository.find({ where: { userId } });
    return res.json(policies);
  } catch (err) {
    logger.error('Failed to get scan policies by user', { 
      userId: (req as any).user?.id, 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const getScanPolicyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const policyId = parseInt(req.params.policyId, 10);
    const policy = await policyRepository.findOneBy({ id: policyId, userId });
    if (!policy) {
      logger.warn('Scan policy not found or not authorized for get by ID', { userId, policyId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Scan policy not found or not authorized' });
    }
    return res.json(policy);
  } catch (err) {
    logger.error('Failed to get scan policy by ID', { 
      userId: (req as any).user?.id, 
      policyId: req.params.policyId,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const updateScanPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const policyId = parseInt(req.params.policyId, 10);
    const { name, provider, tool, description, definition } = req.body;

    const policy = await policyRepository.findOneBy({ id: policyId, userId });
    if (!policy) {
      logger.warn('Scan policy not found or not authorized for update', { userId, policyId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Scan policy not found or not authorized' });
    }

    // If name is being changed, check for uniqueness again with the new name
    if (name && name !== policy.name) {
        const existingPolicyWithName = await policyRepository.findOne({where: {userId, name}});
        if (existingPolicyWithName && existingPolicyWithName.id !== policyId) {
            logger.warn('Attempt to update scan policy name to an already existing name', { userId, policyId, newName: name, path: req.path, method: req.method });
            return res.status(400).json({ message: `Another policy with the name '${name}' already exists.`});
        }
    }

    policy.name = name || policy.name;
    policy.provider = provider || policy.provider;
    policy.tool = tool || policy.tool;
    policy.description = description === undefined ? policy.description : description; // Allow setting description to null/empty
    policy.definition = definition === undefined ? policy.definition : definition; // Allow setting definition to null/empty

    await policyRepository.save(policy);
    logger.info('Scan policy updated', { userId, policyId: policy.id, path: req.path, method: req.method });
    return res.json(policy);
  } catch (err) {
    logger.error('Failed to update scan policy', { 
      userId: (req as any).user?.id, 
      policyId: req.params.policyId,
      body: req.body,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const deleteScanPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const policyId = parseInt(req.params.policyId, 10);
    const result = await policyRepository.delete({ id: policyId, userId });
    if (result.affected === 0) {
      logger.warn('Scan policy not found or not authorized for delete', { userId, policyId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Scan policy not found or not authorized' });
    }
    logger.info('Scan policy deleted', { userId, policyId, path: req.path, method: req.method });
    return res.status(204).send(); // No content
  } catch (err) {
    logger.error('Failed to delete scan policy', { 
      userId: (req as any).user?.id, 
      policyId: req.params.policyId,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};
