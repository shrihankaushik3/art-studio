import express from 'express';
import {
  getAllPaintings,
  getPaintingById,
  createPainting,
  updatePainting,
  purchasePainting,
  cancelOrder,
  getMyOrders,
  getAllOrders
} from '../controllers/paintingController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Order routes (must come before /:id parameterized routes)
router.get('/orders/my', authenticate, getMyOrders);
router.get('/orders/all', authenticate, authorizeRoles('studio', 'admin'), getAllOrders);
router.post('/orders/:orderId/cancel', authenticate, cancelOrder);

// Painting catalog routes
router.get('/', getAllPaintings);
router.get('/:id', getPaintingById);
router.post('/', authenticate, authorizeRoles('studio', 'admin'), createPainting);
router.put('/:id', authenticate, authorizeRoles('studio', 'admin'), updatePainting);
router.post('/:id/purchase', authenticate, purchasePainting);

export default router;
