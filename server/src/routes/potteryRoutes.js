import express from 'express';
import {
  getPotteryOptions,
  createPotteryRequest,
  getMyPotteryRequests,
  getAllPotteryRequests,
  updatePotteryRequest,
  cancelPotteryRequest,
  updatePotteryRequestStatus
} from '../controllers/potteryController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/options', getPotteryOptions);
router.post('/requests', authenticate, createPotteryRequest);
router.get('/requests/my', authenticate, getMyPotteryRequests);
router.get('/requests/all', authenticate, authorizeRoles('studio', 'admin'), getAllPotteryRequests);
router.put('/requests/:id', authenticate, updatePotteryRequest);
router.post('/requests/:id/cancel', authenticate, cancelPotteryRequest);
router.patch('/requests/:id/status', authenticate, authorizeRoles('studio', 'admin'), updatePotteryRequestStatus);

export default router;
