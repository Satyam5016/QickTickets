// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: { type: String, required: true }, // Clerk userId string is fine
  show: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Show' },
  amount: Number,
  bookedSeats: [String],
  isPaid: { type: Boolean, default: false },
  paymentLink: String,
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
