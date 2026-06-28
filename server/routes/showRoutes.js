import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { addShow, getMovieReviews, getNowPlayingMovies, getShow, getShows, submitMovieReview } from "../controllers/showController.js";
import { protectAdmin } from "../middleware/Auth.js";

const showRouter = express.Router();

showRouter.get('/now-playing', getNowPlayingMovies)
showRouter.post('/add', clerkMiddleware(), protectAdmin, addShow)
showRouter.get('/all',getShows)
showRouter.get('/all/:movieId', getShow)
showRouter.get('/:movieId/reviews', getMovieReviews)
showRouter.post('/:movieId/reviews', clerkMiddleware(), submitMovieReview)

export default showRouter;
