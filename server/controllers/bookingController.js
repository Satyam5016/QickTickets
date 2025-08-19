import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// Check seat availability
const checkSeatsAvailability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId);
        if (!showData) return false;

        const occupiedSeats = showData.occupiedSeats;
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
        return !isAnySeatTaken;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

export const createBooking = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { showId, selectedSeats } = req.body;
        const { origin } = req.headers;

        // Check seat availability
        const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
        if (!isAvailable) return res.json({ success: false, message: "Selected seats are not available." });

        const showData = await Show.findById(showId).populate('movie');

        // Create booking
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats,
            isPaid: false
        });

        // Mark seats as occupied
        selectedSeats.forEach(seat => {
            showData.occupiedSeats[seat] = userId;
        });
        showData.markModified('occupiedSeats');
        await showData.save();

        // Create Stripe Checkout Session
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: showData.movie.title },
                    unit_amount: Math.floor(booking.amount * 100)
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${origin}/loading/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            payment_intent_data: {
                metadata: { bookingId: booking._id.toString() } // ✅ attach here
            }
        });




        booking.paymentLink = session.url;
        await booking.save();

        res.json({ success: true, url: session.url });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// Get occupied seats
export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        const showData = await Show.findById(showId);
        const occupiedSeats = Object.keys(showData.occupiedSeats);
        res.json({ success: true, occupiedSeats });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}
