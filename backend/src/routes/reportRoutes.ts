// src/routes/reportRoutes.ts
import { Router } from 'express';
import { generateReport } from '../controllers/reportController';
import { verifyToken } from '../services/authService';

const router = Router();

router.use(verifyToken);

router.post('/', generateReport);

export default router;
