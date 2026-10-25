import express from 'express';
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
  updateBookingStatus
} from '../controllers/bookingController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createBooking);
router.get('/my', authenticate, getMyBookings);
router.get('/all', authenticate, authorizeRoles('studio', 'admin'), getAllBookings);
router.post('/:id/cancel', authenticate, cancelBooking);
router.patch('/:id/status', authenticate, authorizeRoles('studio', 'admin'), updateBookingStatus);

export default router;
