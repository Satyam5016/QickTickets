import Stripe from "stripe";
import Booking from "../models/Booking.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    // ⚠️ request.body must be raw, not parsed JSON (configure express.json with { verify }!)
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
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.metadata && session.metadata.bookingId) {
          const { bookingId } = session.metadata;

          const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { isPaid: true, paymentLink: "" },
            { new: true }
          );

          if (updatedBooking) {
            console.log(`✅ Booking ${bookingId} marked as paid.`);
          } else {
            console.warn(`⚠️ Booking ${bookingId} not found.`);
          }
        } else {
          console.warn("⚠️ No bookingId in session metadata");
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
