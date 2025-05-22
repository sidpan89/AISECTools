// backend/src/routes/scheduledScanRoutes.ts
import { Router } from 'express';
import {
  createScheduledScan,
  getScheduledScansByUser,
  getScheduledScanById,
  updateScheduledScan,
  deleteScheduledScan
} from '../controllers/ScheduledScanController';
import { verifyToken } from '../services/authService';

const router = Router();
router.use(verifyToken);

router.post('/', createScheduledScan);
router.get('/', getScheduledScansByUser);
router.get('/:scheduleId', getScheduledScanById);
router.put('/:scheduleId', updateScheduledScan);
router.delete('/:scheduleId', deleteScheduledScan);

export default router;
