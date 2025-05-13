// src/routes/credentialRoutes.ts
import { Router } from 'express';
import { createServicePrincipal, getServicePrincipal } from '../controllers/credentialController';
import { verifyToken } from '../services/authService';

const router = Router();

router.use(verifyToken); // all routes here require auth

router.post('/', createServicePrincipal);
router.get('/', getServicePrincipal);

export default router;
