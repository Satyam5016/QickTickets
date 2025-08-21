import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // request.body must be raw Buffer (configure express.raw in app.js)
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent?.metadata?.bookingId;

        if (!bookingId) {
          console.error("⚠️ No bookingId in payment metadata");
          return res.status(400).send("Missing bookingId");
        }

        // Mark booking as paid
        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: ""
        });

        // Fire Inngest event → triggers confirmation email
        await inngest.send({
          name: "app/show.booked",
          data: { bookingId }
        });

        break;
      }

      case "payment_intent.payment_failed": {
        console.warn("⚠️ Payment failed:", event.data.object.id);
        // Optionally: trigger seat release event immediately
        break;
      }

      default:
        console.log("Unhandled Stripe event type:", event.type);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("🔥 Error handling Stripe webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
};
