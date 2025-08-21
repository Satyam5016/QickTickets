import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

// Setup __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load mock data
const mockMoviesPath = path.join(__dirname, "mockMovies.json");
const mockMovies = JSON.parse(fs.readFileSync(mockMoviesPath, "utf-8"));

/**
 * Fetch "Now Playing" movies from TMDB
 */
export const getNowPlayingMovies = async (req, res) => {
    try {
        const { data } = await axios.get(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.TMDB_API_KEY}`
        );
        console.log("✅ Fetched real TMDB data");
        res.json({ success: true, movies: data.results });
    } catch (error) {
        console.error("Axios Error:", error.response?.data || error.message);
        console.log("⚡ Using mock data");
        res.json({ success: true, movies: mockMovies.results });
    }
};

/**
 * Add new shows for a movie
 */
export const addShow = async (req, res) => {
    try {
        const { movieId, showsInput, showPrice } = req.body;

        let movie = await Movie.findById(movieId);

        if (!movie) {
            // Fetch details + credits from TMDB
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
                }),
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
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
                    showDateTime: new Date(dateTimeString),
                    showPrice,
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

        // Deduplicate by movie._id
        const uniqueMoviesMap = new Map();
        for (const show of shows) {
            if (!uniqueMoviesMap.has(show.movie._id.toString())) {
                uniqueMoviesMap.set(show.movie._id.toString(), show.movie);
            }
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
            dateTime[date].push({ time: show.showDateTime, showId: show._id });
        });

        res.json({ success: true, movie, dateTime });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};
