// backend/src/routes/scanPolicyRoutes.ts
import { Router } from 'express';
import { 
  createScanPolicy, 
  getScanPoliciesByUser, 
  getScanPolicyById, 
  updateScanPolicy, 
  deleteScanPolicy 
} from '../controllers/ScanPolicyController';
import { verifyToken } from '../services/authService'; // Assuming auth middleware

const router = Router();

router.use(verifyToken); // Secure all policy routes

router.post('/', createScanPolicy);
router.get('/', getScanPoliciesByUser);
router.get('/:policyId', getScanPolicyById);
router.put('/:policyId', updateScanPolicy);
router.delete('/:policyId', deleteScanPolicy);

export default router;
