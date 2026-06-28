import { ArrowRight } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import MovieCard from "./MovieCard";

const FeaturedSection = () => {
  const navigate = useNavigate();
  const { shows } = useAppContext();

  return (
    <section className="px-6 py-20 md:px-16 lg:px-36">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary">Curated showtimes</p>
            <h2 className="text-3xl font-bold md:text-4xl">Now Showing</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Browse active shows, compare starting prices, and book seats in a few clicks.
            </p>
          </div>
          <button
            onClick={() => navigate("/movies")}
            className="inline-flex w-max items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {shows?.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {shows.slice(0, 4).map((show) => (
              <MovieCard key={show._id} movie={show} />
            ))}
          </div>
        ) : (
          <div className="cinema-card flex min-h-64 flex-col items-center justify-center rounded-lg px-6 text-center">
            <h3 className="text-xl font-semibold">No shows scheduled yet</h3>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              Once an admin adds future showtimes, movies will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedSection;
