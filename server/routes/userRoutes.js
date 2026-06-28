import express from "express";
import { getFavorites, getMyBookings, requestBookingCancellation, updateFavorite } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get('/bookings', getMyBookings);
userRouter.post('/bookings/:bookingId/cancel', requestBookingCancellation);
userRouter.post('/update-favorite', updateFavorite);
userRouter.get('/favorites', getFavorites);

export default userRouter;
