import Stripe from "stripe";
import Booking from "../models/Booking.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body, // raw body (⚠️ use express.raw in server.js)
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("❌ Webhook signature verification failed:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;

                if (session.metadata && session.metadata.bookingId) {
                    const { bookingId } = session.metadata;

                    // ✅ Mark booking as paid
                    const updatedBooking = await Booking.findByIdAndUpdate(
                        bookingId,
                        { isPaid: true, paymentLink: "" },
                        { new: true }
                    );

                    if (updatedBooking) {
                        console.log(`✅ Booking ${bookingId} marked as PAID.`);
                    } else {
                        console.warn(`⚠️ Booking ${bookingId} not found.`);
                    }
                }
                break;
            }

            case "checkout.session.expired": {
                const session = event.data.object;

                if (session.metadata && session.metadata.bookingId) {
                    const { bookingId } = session.metadata;

                    // ❌ Expired session = booking not paid
                    const updatedBooking = await Booking.findByIdAndUpdate(
                        bookingId,
                        { isPaid: false },
                        { new: true }
                    );

                    if (updatedBooking) {
                        console.log(`⚠️ Booking ${bookingId} marked as NOT PAID (session expired).`);
                    } else {
                        console.warn(`⚠️ Booking ${bookingId} not found.`);
                    }
                }
                break;
            }

            case "checkout.session.async_payment_failed": {
                const session = event.data.object;

                if (session.metadata && session.metadata.bookingId) {
                    const { bookingId } = session.metadata;

                    // ❌ Payment failed
                    await Booking.findByIdAndUpdate(bookingId, { isPaid: false });

                    console.log(`❌ Booking ${bookingId} payment FAILED.`);
                }
                break;
            }

            default:
                console.log("Unhandled event type:", event.type);
        }

        return response.json({ received: true });
    } catch (err) {
        console.error("❌ Webhook processing error:", err);
        return response.status(500).send("Internal Server Error");
    }
};
