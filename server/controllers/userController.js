// controllers/userController.js
import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import Stripe from "stripe";
import crypto from "crypto";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

const issueTicketCode = (booking) => (
  booking.ticketCode || `QT-${booking._id}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
);

const getSessionIdFromBooking = (booking) => {
  if (booking.stripeSessionId) return booking.stripeSessionId;
  const match = booking.paymentLink?.match(/cs_(?:test|live)_[^/?#]+/);
  return match?.[0] || "";
};

const syncPaidBookingsFromStripe = async (bookings) => {
  const candidates = bookings.filter((booking) => !booking.isPaid && getSessionIdFromBooking(booking));

  await Promise.all(candidates.map(async (booking) => {
    try {
      const sessionId = getSessionIdFromBooking(booking);
      const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") return;

      booking.isPaid = true;
      booking.paymentLink = "";
      booking.stripeSessionId = session.id;
      booking.stripePaymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || booking.stripePaymentIntentId;
      booking.ticketCode = issueTicketCode(booking);
      booking.ticketIssuedAt = booking.ticketIssuedAt || new Date();
      await booking.save();
    } catch (error) {
      console.error("Unable to sync Stripe booking status:", error.message);
    }
  }));
};

// Get My Bookings
export const getMyBookings = async (req, res) => {
  try {
    const { userId } = req.auth();
    let bookings = await Booking.find({ user: userId })
      .populate({ path: "show", populate: { path: "movie" } })
      .sort({ createdAt: -1 });

    await syncPaidBookingsFromStripe(bookings);
    bookings = await Booking.find({ user: userId })
      .populate({ path: "show", populate: { path: "movie" } })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

// Request Booking Cancellation / Refund
export const requestBookingCancellation = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate("show");
    if (!booking) {
      return res.json({ success: false, message: "Booking not found." });
    }

    if (booking.status === "cancelled") {
      return res.json({ success: false, message: "This booking is already cancelled." });
    }

    if (booking.status === "cancel_requested") {
      return res.json({ success: false, message: "Cancellation request is already pending." });
    }

    if (!booking.show || new Date(booking.show.showDateTime) <= new Date()) {
      return res.json({ success: false, message: "Bookings can only be cancelled before showtime." });
    }

    booking.status = "cancel_requested";
    booking.refundStatus = booking.isPaid ? "requested" : "none";
    booking.cancellationReason = reason || "";
    booking.cancellationRequestedAt = new Date();
    await booking.save();

    res.json({ success: true, message: "Cancellation request sent to admin.", booking });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

// Update Favorite Movies
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const { userId } = req.auth();

    const user = await clerkClient.users.getUser(userId);

    // Ensure favorites exists
    const favorites = user.privateMetadata?.favorites || [];

    let updatedFavorites;
    if (!favorites.includes(movieId)) {
      updatedFavorites = [...favorites, movieId];
    } else {
      updatedFavorites = favorites.filter((id) => id !== movieId);
    }

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { favorites: updatedFavorites },
    });

    res.json({ success: true, favorites: updatedFavorites });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

// Get Favorite Movies
export const getFavorites = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await clerkClient.users.getUser(userId);

    const favorites = user.privateMetadata?.favorites || [];

    const movies = await Movie.find({ _id: { $in: favorites } });

    res.json({ success: true, movies });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
