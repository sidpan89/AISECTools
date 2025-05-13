// src/routes/scanRoutes.ts
import { Router } from 'express';
import { startScan, getScans, getFindingsForScan } from '../controllers/scanController';
import { verifyToken } from '../services/authService';

const router = Router();

router.use(verifyToken);

router.get('/', getScans);
router.post('/', startScan);
router.get('/:scanId/findings', getFindingsForScan);

export default router;
