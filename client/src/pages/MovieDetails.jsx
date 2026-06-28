import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, PlayCircleIcon, StarIcon } from "lucide-react";
import toast from "react-hot-toast";
import timeFormat from "../lib/timeFormat";
import DateSelect from "../components/DateSelect";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";
import { useAppContext } from "../context/AppContext";
import TrailersSection from "../components/TrailersSection"; // ✅ make sure you import this

const MovieDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [show, setShow] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [canReview, setCanReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const dateSelectRef = useRef(null);
  const trailerRef = useRef(null); // ✅ added ref for trailer section

  const {
    shows,
    axiosInstance,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
    image_base_url,
  } = useAppContext();

  // ✅ Fetch movie details
  const getShow = async () => {
    try {
      const { data } = await axiosInstance.get(`/show/all/${id}`);
      if (data.success) {
        setShow(data.show || { movie: data.movie, dateTime: data.dateTime });
      }
    } catch (error) {
      console.error("Error fetching show:", error);
      toast.error("Failed to fetch movie details");
    }
  };

  const getReviews = async () => {
    try {
      const headers = user ? { Authorization: `Bearer ${await getToken()}` } : {};
      const { data } = await axiosInstance.get(`/show/${id}/reviews`, { headers });

      if (data.success) {
        setReviews(data.reviews || []);
        setReviewSummary(data.summary || { averageRating: 0, totalReviews: 0 });
        setCanReview(Boolean(data.canReview));

        if (data.userReview) {
          setReviewForm({
            rating: data.userReview.rating,
            comment: data.userReview.comment,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();

    if (!user) return toast.error("Please login to review this movie");
    if (!reviewForm.comment.trim()) return toast.error("Please write a short review");

    try {
      setSubmittingReview(true);
      const { data } = await axiosInstance.post(
        `/show/${id}/reviews`,
        reviewForm,
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (data.success) {
        toast.success(data.message);
        getReviews();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Unable to save review");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ✅ Handle add/remove favorites
  const handleFavorite = async () => {
    try {
      if (!user) return toast.error("Please login to proceed");

      const { data } = await axiosInstance.post(
        "/user/update-favorite",
        { movieId: id },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        const isFavorite = favoriteMovies.find(
          (movie) => String(movie._id) === String(id)
        );

        if (isFavorite) {
          const updatedFavorites = favoriteMovies.filter(
            (movie) => String(movie._id) !== String(id)
          );
          fetchFavoriteMovies && fetchFavoriteMovies();
          toast.success("Removed from favorites");
        } else {
          fetchFavoriteMovies && fetchFavoriteMovies();
          toast.success("Added to favorites");
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Something went wrong");
    }
  };

  useEffect(() => {
    getShow();
  }, [id]);

  useEffect(() => {
    getReviews();
  }, [id, user]);

  if (!show) return <Loading />;

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-24 md:pt-32">
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        {/* Poster */}
        <img
          src={
            show.movie.poster_path
              ? image_base_url + show.movie.poster_path
              : "/placeholder.jpg"
          }
          alt={show.movie.title}
          className="max-md:mx-auto rounded-xl h-[26rem] max-w-[18rem] object-cover"
        />

        {/* Details */}
        <div className="relative flex flex-col gap-3">
          <p className="text-primary uppercase">English</p>

          <h1 className="text-4xl font-semibold max-w-xl">
            {show.movie.title}
          </h1>

          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {show.movie.vote_average?.toFixed(1)} User Rating
          </div>

          <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
            {show.movie.overview}
          </p>

          <p className="text-gray-300 text-sm">
            {timeFormat(show.movie.runtime)} •{" "}
            {show.movie.genres?.map((genre) => genre.name).join(", ")} •{" "}
            {show.movie.release_date?.split("-")[0]}
          </p>

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-4 mt-4">
            {/* ✅ Watch Trailer scroll */}
            <button
              onClick={() =>
                trailerRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95"
            >
              <PlayCircleIcon className="w-5 h-5" />
              Watch Trailer
            </button>

            {/* ✅ Buy Tickets scroll */}
            <button
              onClick={() =>
                dateSelectRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
            >
              Buy Tickets
            </button>

            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-5 h-5 ${
                  favoriteMovies.find(
                    (movie) => String(movie._id) === String(id)
                  )
                    ? "fill-primary text-primary"
                    : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      <p className="text-lg font-medium mt-20">Your Favorite Cast</p>
      <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
        <div className="flex items-center gap-4 w-max px-4">
          {show.movie.casts?.slice(0, 12).map((cast, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <img
                src={
                  image_base_url + cast.profile_path
                    ? image_base_url + cast.profile_path
                    : "/avatar-placeholder.png"
                }
                alt={cast.name}
                className="rounded-full h-20 aspect-square object-cover"
              />
              <p className="font-medium text-xs mt-3">{cast.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date Selection */}
      <div ref={dateSelectRef}>
        <DateSelect dateTime={show.dateTime} id={id} />
      </div>

      {/* ✅ Trailer Section with ref */}
      <div ref={trailerRef}>
        <TrailersSection />
      </div>

      {/* Reviews */}
      <div className="mt-20 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <p className="text-lg font-medium">Reviews & Ratings</p>
            <p className="text-sm text-gray-400 mt-1">
              {reviewSummary.totalReviews > 0
                ? `${reviewSummary.averageRating} out of 5 from ${reviewSummary.totalReviews} review${reviewSummary.totalReviews === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </div>
          {reviewSummary.totalReviews > 0 && (
            <div className="flex items-center gap-1 text-primary">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(reviewSummary.averageRating) ? "fill-primary" : ""}`}
                />
              ))}
            </div>
          )}
        </div>

        {canReview ? (
          <form onSubmit={submitReview} className="border border-primary/20 bg-primary/5 rounded-md p-4 mb-6">
            <p className="text-sm font-medium mb-3">Your Review</p>
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setReviewForm((prev) => ({ ...prev, rating }))}
                  className="p-1"
                  aria-label={`Rate ${rating} stars`}
                >
                  <StarIcon
                    className={`w-6 h-6 text-primary ${rating <= reviewForm.rating ? "fill-primary" : ""}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
              maxLength={300}
              rows={3}
              placeholder="Write a short review after watching..."
              className="w-full bg-transparent border border-gray-700 rounded-md p-3 text-sm outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">{reviewForm.comment.length}/300</p>
              <button
                disabled={submittingReview}
                className="px-5 py-2 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium disabled:opacity-60"
              >
                {submittingReview ? "Saving..." : "Save Review"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500 mb-6">You can review this movie after watching a paid show.</p>
        )}

        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="border border-primary/20 bg-primary/5 rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {review.user?.image && (
                    <img src={review.user.image} alt={review.user?.name || "User"} className="h-9 w-9 rounded-full object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{review.user?.name || "Moviegoer"}</p>
                    <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-primary shrink-0">
                  <StarIcon className="w-4 h-4 fill-primary" />
                  <span className="text-sm text-white">{review.rating}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-3 leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <p className="text-lg font-medium mt-20 mb-8">You May Also Like</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {shows.slice(0, 4).map((movie) => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>

      {/* Show More */}
      <div className="flex justify-center mt-20">
        <button
          onClick={() => {
            navigate("/movies");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
        >
          Show more
        </button>
      </div>
    </div>
  );
};

export default MovieDetails;
