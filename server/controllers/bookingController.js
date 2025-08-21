import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Utility to check if selected seats are free
 */
const checkSeatsAvailability = async (showId, selectedSeats) => {
  const showData = await Show.findById(showId);
  if (!showData) return false;

  const occupiedSeats = showData.occupiedSeats || {};
  const anyTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
  return !anyTaken;
};

/**
 * Create booking + Stripe checkout session
 */
export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth(); // Clerk userId
    const { showId, selectedSeats } = req.body;
    const origin = req.headers.origin || process.env.FRONTEND_URL;

    // 1) Validate seat availability
    const ok = await checkSeatsAvailability(showId, selectedSeats);
    if (!ok) {
      return res.json({
        success: false,
        message: "Selected seats are not available.",
      });
    }

    // 2) Create booking in DB
    const showData = await Show.findById(showId).populate("movie");
    if (!showData) {
      return res.json({ success: false, message: "Show not found." });
    }

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
      isPaid: false,
    });

    // 3) Lock seats
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await showData.save();

    // 4) Create Stripe Checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: showData.movie.title },
            unit_amount: Math.floor(booking.amount * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      payment_intent_data: {
        metadata: { bookingId: booking._id.toString() },
      },
    });

    booking.paymentLink = session.url;
    await booking.save();

    // 5) Schedule seat release if unpaid
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Booking error:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Get occupied seats for a show
 */
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    if (!showData) {
      return res.json({ success: false, message: "Show not found." });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats || {});
    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error("Get occupied seats error:", error);
    res.json({ success: false, message: error.message });
  }
};
