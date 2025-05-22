// src/routes/credentialRoutes.ts
import { Router } from 'express';
import { 
  createCloudCredential, 
  getCloudCredentials, 
  deleteCloudCredential 
} from '../controllers/credentialController';
import { verifyToken } from '../services/authService';

const router = Router();

router.use(verifyToken); // all routes here require auth

router.post('/', createCloudCredential);
router.get('/', getCloudCredentials);
router.delete('/:credentialId', deleteCloudCredential); // Added delete route

export default router;
