// controllers/userController.js
import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

// Get My Bookings
export const getMyBookings = async (req, res) => {
  try {
    const { userId } = req.auth();
    const bookings = await Booking.find({ user: userId })
      .populate({ path: "show", populate: { path: "movie" } })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

// Update Favorite Movies
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const { userId } = req.auth();

    const user = await clerkClient.users.getUser(userId);

    // Ensure favorites exists
    const favorites = user.privateMetadata?.favorites || [];

    let updatedFavorites;
    if (!favorites.includes(movieId)) {
      updatedFavorites = [...favorites, movieId];
    } else {
      updatedFavorites = favorites.filter((id) => id !== movieId);
    }

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { favorites: updatedFavorites },
    });

    res.json({ success: true, favorites: updatedFavorites });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

// Get Favorite Movies
export const getFavorites = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await clerkClient.users.getUser(userId);

    const favorites = user.privateMetadata?.favorites || [];

    const movies = await Movie.find({ _id: { $in: favorites } });

    res.json({ success: true, movies });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
