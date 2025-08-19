import Stripe from "stripe";
import Booking from "../models/Booking.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
        // request.body must be the raw body, not parsed JSON
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("❌ Webhook signature verification failed:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;

                // Get session associated with this payment intent
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id,
                });

                const session = sessionList.data[0];
                if (session && session.metadata && session.metadata.bookingId) {
                    const { bookingId } = session.metadata;

                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: "",
                    });

                    console.log(`✅ Booking ${bookingId} marked as paid.`);
                } else {
                    console.warn("⚠️ No session or bookingId found for payment intent:", paymentIntent.id);
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
