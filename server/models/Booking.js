// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: { type: String, required: true }, // Clerk userId string is fine
  show: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Show' },
  amount: Number,
  bookedSeats: [String],
  bookedSeatDetails: [
    {
      seat: String,
      category: String,
      price: Number,
    }
  ],
  foodItems: [
    {
      id: String,
      name: String,
      price: Number,
      quantity: Number,
    }
  ],
  seatsAmount: { type: Number, default: 0 },
  foodAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  coupon: {
    code: String,
    label: String,
    discountType: String,
    discountValue: Number,
  },
  isPaid: { type: Boolean, default: false },
  paymentLink: String,
  stripeSessionId: String,
  stripePaymentIntentId: String,
  ticketCode: String,
  ticketIssuedAt: Date,
  status: {
    type: String,
    enum: ["booked", "cancel_requested", "cancelled", "cancel_rejected"],
    default: "booked",
  },
  refundStatus: {
    type: String,
    enum: ["none", "requested", "approved", "rejected", "manual_required"],
    default: "none",
  },
  cancellationReason: String,
  cancellationRequestedAt: Date,
  cancellationReviewedAt: Date,
  cancellationReviewedBy: String,
  cancellationAdminNote: String,
  stripeRefundId: String,
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
