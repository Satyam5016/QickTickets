import { Inngest } from "inngest";
import User from "../models/User.js";  // 👈 make sure you include `.js` extension in ES modules

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
        _id: id,
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

export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
