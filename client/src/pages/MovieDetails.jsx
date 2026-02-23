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
