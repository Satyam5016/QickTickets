import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// API to check if user is admin
export const isAdmin = async (req, res) => {
    res.json({ success: true, isAdmin: true });
};

// API to get dashboard data
export const getDashboardData = async (req, res) => {
    try {
        const bookings = await Booking.find({ isPaid: true }).populate({
            path: "show",
            populate: { path: "movie" }
        });
        const completedBookings = bookings.filter((booking) => booking.status !== "cancelled");
        const cancelledBookings = await Booking.find({ status: "cancelled" });
        const activeShows = await Show.find({ showDateTime: { $gte: new Date() } }).populate('movie');
        const allShows = await Show.find({}).populate('movie');

        const totalUsers = await User.countDocuments();
        const dailyBookingsMap = new Map();
        const movieBookingsMap = new Map();
        const seatCapacityPerShow = 90;

        completedBookings.forEach((booking) => {
            const day = booking.createdAt.toISOString().split("T")[0];
            const currentDay = dailyBookingsMap.get(day) || { date: day, bookings: 0, revenue: 0 };
            currentDay.bookings += 1;
            currentDay.revenue += booking.amount || 0;
            dailyBookingsMap.set(day, currentDay);

            const movieTitle = booking.show?.movie?.title || "Unknown Movie";
            const currentMovie = movieBookingsMap.get(movieTitle) || {
                movieTitle,
                bookings: 0,
                seats: 0,
                revenue: 0,
            };
            currentMovie.bookings += 1;
            currentMovie.seats += booking.bookedSeats?.length || 0;
            currentMovie.revenue += booking.amount || 0;
            movieBookingsMap.set(movieTitle, currentMovie);
        });

        const dailyBookings = Array.from(dailyBookingsMap.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);
        const mostBookedMovies = Array.from(movieBookingsMap.values())
            .sort((a, b) => b.seats - a.seats)
            .slice(0, 5);
        const totalBookedSeats = allShows.reduce((total, show) => total + Object.keys(show.occupiedSeats || {}).length, 0);
        const totalSeatCapacity = allShows.length * seatCapacityPerShow;
        const occupancyRate = totalSeatCapacity > 0
            ? Number(((totalBookedSeats / totalSeatCapacity) * 100).toFixed(1))
            : 0;

        const dashboardData = {
            totalBookings: completedBookings.length,
            totalRevenue: completedBookings.reduce((acc, booking) => acc + booking.amount, 0),
            cancelledBookings: cancelledBookings.length,
            occupancyRate,
            totalBookedSeats,
            totalSeatCapacity,
            activeShows,
            totalUsers,
            analytics: {
                dailyBookings,
                mostBookedMovies,
                cancelledBookings: cancelledBookings.length,
                occupancyRate,
            }
        }

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

// API to get all shows
export const getAllShows = async (req, res) => {
    try {
        const shows = await Show.find({ showDateTime: { $gte: new Date() } }).populate('movie').sort({ showDateTime: 1 });
        res.json({ success: true, shows });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

// API to get all bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

// API to approve or reject a cancellation / refund request
export const reviewCancellationRequest = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { action, note } = req.body;
        const { userId } = req.auth();

        if (!["approve", "reject"].includes(action)) {
            return res.json({ success: false, message: "Invalid cancellation action." });
        }

        const booking = await Booking.findById(bookingId).populate("show");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found." });
        }

        if (booking.status !== "cancel_requested") {
            return res.json({ success: false, message: "No pending cancellation request for this booking." });
        }

        if (action === "reject") {
            booking.status = "cancel_rejected";
            booking.refundStatus = booking.isPaid ? "rejected" : "none";
            booking.cancellationReviewedAt = new Date();
            booking.cancellationReviewedBy = userId;
            booking.cancellationAdminNote = note || "";
            await booking.save();

            return res.json({ success: true, message: "Cancellation request rejected.", booking });
        }

        const show = await Show.findById(booking.show?._id || booking.show);
        if (show) {
            booking.bookedSeats.forEach((seat) => {
                delete show.occupiedSeats[seat];
            });
            show.markModified("occupiedSeats");
            await show.save();
        }

        let refundStatus = "none";
        let stripeRefundId = "";

        if (booking.isPaid) {
            if (booking.stripePaymentIntentId) {
                const refund = await stripeInstance.refunds.create({
                    payment_intent: booking.stripePaymentIntentId,
                    metadata: { bookingId: booking._id.toString() },
                });
                refundStatus = "approved";
                stripeRefundId = refund.id;
            } else {
                refundStatus = "manual_required";
            }
        }

        booking.status = "cancelled";
        booking.refundStatus = refundStatus;
        booking.stripeRefundId = stripeRefundId;
        booking.cancellationReviewedAt = new Date();
        booking.cancellationReviewedBy = userId;
        booking.cancellationAdminNote = note || "";
        await booking.save();

        res.json({ success: true, message: "Booking cancelled successfully.", booking });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}
