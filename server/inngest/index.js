import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodemailer.js";  // ✅ import sendEmail

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

/**
 * Sync user creation from Clerk -> MongoDB
 */
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } = event.data;

      const userData = {
        _id: id, // Clerk userId will be the MongoDB _id
        email: email_addresses?.[0]?.email_address || "",
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        image: image_url,
      };

      await User.create(userData);
      return { success: true, user: userData };
    } catch (err) {
      console.error("Error creating user:", err);
      throw err;
    }
  }
);

/**
 * Sync user deletion from Clerk -> MongoDB
 */
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    try {
      const { id } = event.data;
      await User.findByIdAndDelete(id);
      return { success: true, deletedId: id };
    } catch (err) {
      console.error("Error deleting user:", err);
      throw err;
    }
  }
);

/**
 * Sync user updates from Clerk -> MongoDB
 */
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } = event.data;

      const userData = {
        email: email_addresses?.[0]?.email_address || "",
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        image: image_url,
      };

      await User.findByIdAndUpdate(id, userData, { new: true });
      return { success: true, updatedId: id, user: userData };
    } catch (err) {
      console.error("Error updating user:", err);
      throw err;
    }
  }
);

/**
 * Release seats if not paid after 10 minutes
 */
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);

    // wait for 10 minutes
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

      if (booking && !booking.isPaid) {
        const show = await Show.findById(booking.show);
        if (show) {
          booking.bookedSeats.forEach((seat) => {
            delete show.occupiedSeats[seat];
          });
          show.markModified("occupiedSeats");
          await show.save();
        }
        await Booking.findByIdAndDelete(booking._id);
      }
    });
  }
);

/**
 * Send booking confirmation email when payment succeeds
 */
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event }) => {
    const { bookingId } = event.data;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      });

    // 🔑 Fetch user separately using ClerkId
    const user = await User.findById(booking.user);

    if (!booking || !user) {
      console.error("Booking or user not found for bookingId:", bookingId);
      return { success: false };
    }

    await sendEmail({
      to: user.email,   // ✅ now using the User model email
      subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hi ${user.name},</h2>
          <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
          <p>
            <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}<br/>
            <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
          </p>
          <p>Enjoy the show! 🍿</p>
          <p>Thanks for booking with us!<br/>- QuickShow Team</p>
        </div>
      `,
    });

    return { success: true };
  }
);


export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
];
