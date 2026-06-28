import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import { inngest } from "../inngest/index.js";

const TMDB_TIMEOUT_MS = 5000;

/**
 * Fetch "Now Playing" movies from TMDB
 */
export const getNowPlayingMovies = async (req, res) => {
    try {
        const { data } = await axios.get(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.TMDB_API_KEY}`,
            { timeout: TMDB_TIMEOUT_MS }
        );
        console.log("✅ Fetched real TMDB data");
        res.json({ success: true, movies: data.results });
    } catch (error) {
        console.error("Axios Error:", error.response?.data || error.message);
        res.json({ success: false, message: "Failed to fetch movies from TMDB." });
    }
};

/**
 * Add new shows for a movie
 */
export const addShow = async (req, res) => {
    try {
        const { movieId, showsInput, showPrice, seatCategoryPrices, city, theater, screen } = req.body;
        const venue = {
            city: String(city || "Mumbai").trim() || "Mumbai",
            theater: String(theater || "QuickTickets Cinema").trim() || "QuickTickets Cinema",
            screen: String(screen || "Screen 1").trim() || "Screen 1",
        };
        const basePrice = Number(showPrice);
        const normalizedSeatCategoryPrices = {
            Regular: Number(seatCategoryPrices?.Regular || basePrice),
            Premium: Number(seatCategoryPrices?.Premium || basePrice),
            Recliner: Number(seatCategoryPrices?.Recliner || basePrice),
            VIP: Number(seatCategoryPrices?.VIP || basePrice),
        };

        let movie = await Movie.findById(movieId);

        if (!movie) {
            // Fetch details + credits from TMDB
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
                    timeout: TMDB_TIMEOUT_MS,
                }),
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
                    timeout: TMDB_TIMEOUT_MS,
                }),
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            movie = await Movie.create({
                _id: movieId,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres,
                casts: movieCreditsData.cast,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
            });
        }

        // Prepare shows
        const showsToCreate = [];
        for (const show of showsInput) {
            const showDate = show.date;
            for (const time of show.time) {
                const dateTimeString = `${showDate}T${time}`;
                showsToCreate.push({
                    movie: movieId,
                    ...venue,
                    showDateTime: new Date(dateTimeString),
                    showPrice: normalizedSeatCategoryPrices.Regular,
                    seatCategoryPrices: normalizedSeatCategoryPrices,
                    occupiedSeats: {},
                });
            }
        }

        if (showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
        }

        // Trigger Inngest event
        await inngest.send({
            name: "app/show.added",
            data: { movieTitle: movie.title },
        });

        res.json({ success: true, message: "Show added successfully." });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

/**
 * Get all upcoming shows (unique movies only)
 */
export const getShows = async (req, res) => {
    try {
        const shows = await Show.find({ showDateTime: { $gte: new Date() } })
            .populate("movie")
            .sort({ showDateTime: 1 });

        // Deduplicate by movie._id while keeping show metadata for filters.
        const uniqueMoviesMap = new Map();
        for (const show of shows) {
            if (!show.movie) continue;

            const movieId = show.movie._id.toString();
            const regularPrice = Number(show.seatCategoryPrices?.Regular || show.showPrice || 0);
            const categoryPrices = Object.values(show.seatCategoryPrices || {})
                .map((price) => Number(price))
                .filter((price) => Number.isFinite(price) && price > 0);
            const lowestShowPrice = categoryPrices.length > 0
                ? Math.min(...categoryPrices)
                : regularPrice;
            const highestShowPrice = categoryPrices.length > 0
                ? Math.max(...categoryPrices)
                : regularPrice;

            if (!uniqueMoviesMap.has(movieId)) {
                uniqueMoviesMap.set(movieId, {
                    ...show.movie.toObject(),
                    availableShows: [],
                    minPrice: lowestShowPrice,
                    maxPrice: highestShowPrice,
                    nextShowTime: show.showDateTime,
                });
            }

            const movie = uniqueMoviesMap.get(movieId);
            movie.availableShows.push({
                showId: show._id,
                city: show.city || "Mumbai",
                theater: show.theater || "QuickTickets Cinema",
                screen: show.screen || "Screen 1",
                showDateTime: show.showDateTime,
                showPrice: show.showPrice,
                seatCategoryPrices: show.seatCategoryPrices,
            });
            movie.minPrice = Math.min(movie.minPrice, lowestShowPrice);
            movie.maxPrice = Math.max(movie.maxPrice, highestShowPrice);
        }

        res.json({ success: true, shows: Array.from(uniqueMoviesMap.values()) });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

/**
 * Get upcoming shows for a single movie
 */
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;

        const shows = await Show.find({
            movie: movieId,
            showDateTime: { $gte: new Date() },
        });

        const movie = await Movie.findById(movieId);
        const dateTime = {};

        shows.forEach((show) => {
            const date = show.showDateTime.toISOString().split("T")[0];
            if (!dateTime[date]) dateTime[date] = [];
            dateTime[date].push({
                time: show.showDateTime,
                showId: show._id,
                city: show.city || "Mumbai",
                theater: show.theater || "QuickTickets Cinema",
                screen: show.screen || "Screen 1",
                showPrice: show.showPrice,
                seatCategoryPrices: show.seatCategoryPrices,
            });
        });

        res.json({ success: true, movie, dateTime });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

export const getMovieReviews = async (req, res) => {
    try {
        const { movieId } = req.params;
        const userId = req.auth?.()?.userId;

        const reviews = await Review.find({ movie: movieId })
            .populate("user", "name image")
            .sort({ createdAt: -1 });

        const averageRating = reviews.length
            ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
            : 0;

        let canReview = false;
        let userReview = null;

        if (userId) {
            const watchedBooking = await Booking.findOne({
                user: userId,
                isPaid: true,
                status: { $ne: "cancelled" },
            }).populate({
                path: "show",
                match: {
                    movie: movieId,
                    showDateTime: { $lt: new Date() },
                },
            });

            canReview = Boolean(watchedBooking?.show);
            userReview = await Review.findOne({ movie: movieId, user: userId });
        }

        res.json({
            success: true,
            reviews,
            summary: {
                averageRating: Number(averageRating.toFixed(1)),
                totalReviews: reviews.length,
            },
            canReview,
            userReview,
        });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

export const submitMovieReview = async (req, res) => {
    try {
        const { movieId } = req.params;
        const { userId } = req.auth();
        const { rating, comment } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "Please login to review this movie." });
        }

        const numericRating = Number(rating);
        const cleanComment = String(comment || "").trim();

        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.json({ success: false, message: "Rating must be between 1 and 5." });
        }

        if (cleanComment.length < 5 || cleanComment.length > 300) {
            return res.json({ success: false, message: "Review must be between 5 and 300 characters." });
        }

        const watchedBooking = await Booking.findOne({
            user: userId,
            isPaid: true,
            status: { $ne: "cancelled" },
        }).populate({
            path: "show",
            match: {
                movie: movieId,
                showDateTime: { $lt: new Date() },
            },
        });

        if (!watchedBooking?.show) {
            return res.json({ success: false, message: "You can review this movie after watching a paid show." });
        }

        const review = await Review.findOneAndUpdate(
            { movie: movieId, user: userId },
            { rating: numericRating, comment: cleanComment },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).populate("user", "name image");

        res.json({ success: true, message: "Review saved.", review });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};
