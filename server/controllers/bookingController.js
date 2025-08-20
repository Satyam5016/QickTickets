import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Check seat availability
const checkSeatsAvailability = async (showId, selectedSeats) => {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats;
    return !selectedSeats.some(seat => occupiedSeats[seat]);
};


// ✅ Create Booking
export const createBooking = async (req, res) => {
    try {
        const { userId } = req.auth?.() || {}; // Adjust based on your auth middleware
        const { showId, selectedSeats } = req.body;
        const { origin } = req.headers;

        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
        if (!isAvailable) {
            return res.json({ success: false, message: "Selected seats are not available." });
        }

        const showData = await Show.findById(showId).populate("movie");
        if (!showData) return res.status(404).json({ success: false, message: "Show not found." });

        // Create Booking in DB
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats,
            isPaid: false
        });

        // Mark seats as temporarily reserved
        selectedSeats.forEach(seat => {
            showData.occupiedSeats[seat] = userId;
        });
        showData.markModified("occupiedSeats");
        await showData.save();

        // ✅ Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: showData.movie.title },
                        unit_amount: Math.floor(booking.amount * 100)
                    },
                    quantity: 1
                }
            ],
            mode: "payment",
            success_url: `${origin}/loading/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            metadata: {
                bookingId: booking._id.toString()
            }
        });

        booking.paymentLink = session.url;
        await booking.save();

        // Optional: send event for async checks
        await inngest.send({
            name: "app/checkpayment",
            data: { bookingId: booking._id.toString() }
        });

        return res.json({ success: true, url: session.url });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
};

// ✅ Get occupied seats
export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        const showData = await Show.findById(showId);
        if (!showData) return res.status(404).json({ success: false, message: "Show not found." });

        const occupiedSeats = Object.keys(showData.occupiedSeats || {});
        return res.json({ success: true, occupiedSeats });
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: error.message });
    }
};
