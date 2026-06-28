import express from 'express';
import { createBooking, getOccupiedSeats, validateCoupon } from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.post('/coupon/validate', validateCoupon);
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;
