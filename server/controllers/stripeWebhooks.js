import Stripe from "stripe";
import Booking from "../models/Booking.js";

export const stripeWebhooks = async (request, response) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];

  let event;
  try {
    // request.body is a raw Buffer thanks to express.raw
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent?.metadata?.bookingId;
        if (!bookingId) {
          console.log("No bookingId in metadata");
          return response.status(400).send("Missing bookingId");
        }

        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: ""
        });
        break;
      }

      // optional: handle failed payments to free seats, etc.
      default:
        console.log("Unhandled event type:", event.type);
    }

    return response.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return response.status(500).send("Internal Server Error");
  }
};
