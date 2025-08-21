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
      return { success: false, error: err.message };
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
      return { success: false, error: err.message };
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

      const updated = await User.findByIdAndUpdate(id, userData, { new: true });
      return { success: true, updatedId: id, user: updated };
    } catch (err) {
      console.error("Error updating user:", err);
      return { success: false, error: err.message };
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

    return await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

      if (!booking) return { success: false, message: "Booking not found." };
      if (booking.isPaid) return { success: true, message: "Already paid." };

      const show = await Show.findById(booking.show);
      if (show) {
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });
        show.markModified("occupiedSeats");
        await show.save();
      }

      await Booking.findByIdAndDelete(booking._id);
      return { success: true, message: "Unpaid booking deleted, seats released." };
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

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: { path: "movie", model: "Movie" },
    });

    if (!booking) return { success: false, message: "Booking not found" };

    const user = await User.findById(booking.user);
    if (!user) return { success: false, message: "User not found" };

    await sendEmail({
      to: user.email,
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

    return { success: true, message: "Confirmation email sent." };
  }
);

/**
 * Send reminders for upcoming shows
 */
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" }, // Every 8 hours
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showDateTime: { $gte: windowStart, $lte: in8Hours },
      }).populate("movie");

      const tasks = [];
      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;

        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if (userIds.length === 0) continue;

        const users = await User.find({ _id: { $in: userIds } }).select("name email");

        for (const user of users) {
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showDateTime,
          });
        }
      }
      return tasks;
    });

    if (reminderTasks.length === 0) {
      return { success: true, sent: 0, message: "No reminders to send." };
    }

    const results = await step.run("send-all-reminders", async () =>
      Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
            body: `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Hello ${task.userName},</h2>
                <p>This is a reminder that your movie:</p>
                <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
                <p>
                  is scheduled for <strong>${new Date(task.showTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}</strong> at
                  <strong>${new Date(task.showTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}</strong>.
                </p>
                <p>It starts in approximately <strong>8 hours</strong> - make sure you're ready!</p>
                <br/>
                <p>Enjoy the show!<br/>QuickShow Team</p>
              </div>`
          })
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return { success: true, sent, failed, message: `Sent ${sent} reminder(s), ${failed} failed.` };
  }
);

/**
 * Send notifications when a new show is added
 */
const sendNewShowNotifications = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle } = event.data;
    const users = await User.find({});

    await Promise.all(
      users.map((user) =>
        sendEmail({
          to: user.email,
          subject: `🎬 New Show Added: ${movieTitle}`,
          body: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>We've just added a new show:</p>
              <h3 style="color: #F84565;">"${movieTitle}"</h3>
              <p>Visit our website to book your seats!</p>
              <br/>
              <p>Thanks,<br/>QuickShow Team</p>
            </div>`
        })
      )
    );

    return { success: true, message: "Notifications sent to all users." };
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,
];
