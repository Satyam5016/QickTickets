import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// utility
const checkSeatsAvailability = async (showId, selectedSeats) => {
  const showData = await Show.findById(showId);
  if (!showData) return false;
  const occupiedSeats = showData.occupiedSeats || {};
  const anyTaken = selectedSeats.some(seat => occupiedSeats[seat]);
  return !anyTaken;
};

export const createBooking = async (req, res) => {
  try {
    // Clerk
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const origin = req.headers.origin || process.env.FRONTEND_URL;

    // 1) Check seats
    const ok = await checkSeatsAvailability(showId, selectedSeats);
    if (!ok) return res.json({ success: false, message: "Selected seats are not available." });

    // 2) Create booking doc
    const showData = await Show.findById(showId).populate('movie');
    const booking = await Booking.create({
      user: userId,                                 // Clerk user id as string
      show: showId,                                 // we will join this when listing
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
      isPaid: false
    });

    // 3) lock seats
    selectedSeats.forEach(seat => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified('occupiedSeats');
    await showData.save();

    // 4) Stripe Checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: showData.movie.title },
          unit_amount: Math.floor(booking.amount * 100),
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      // attach bookingId to PaymentIntent for webhook
      payment_intent_data: {
        metadata: { bookingId: booking._id.toString() }
      }
    });

    booking.paymentLink = session.url;
    await booking.save();

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    const occupiedSeats = Object.keys(showData.occupiedSeats || {});
    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
