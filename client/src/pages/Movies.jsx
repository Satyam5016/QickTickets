import React, { useMemo, useState } from 'react'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContext'
import { Search, SlidersHorizontal, X } from 'lucide-react'

const Movies = () => {
  const { shows } = useAppContext()
  const currency = import.meta.env.VITE_CURRENCY || "$"

  const [filters, setFilters] = useState({
    search: "",
    genre: "",
    language: "",
    rating: "",
    releaseYear: "",
    maxPrice: "",
    showTiming: "",
  })

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      genre: "",
      language: "",
      rating: "",
      releaseYear: "",
      maxPrice: "",
      showTiming: "",
    })
  }

  const getShowTiming = (showDateTime) => {
    const hour = new Date(showDateTime).getHours()
    if (hour < 12) return "Morning"
    if (hour < 17) return "Afternoon"
    if (hour < 21) return "Evening"
    return "Night"
  }

  const filterOptions = useMemo(() => {
    const genres = new Set()
    const languages = new Set()
    const releaseYears = new Set()
    let maxMoviePrice = 0

    shows.forEach((movie) => {
      movie.genres?.forEach((genre) => genres.add(genre.name))
      if (movie.original_language) languages.add(movie.original_language.toUpperCase())
      if (movie.release_date) releaseYears.add(new Date(movie.release_date).getFullYear())
      maxMoviePrice = Math.max(maxMoviePrice, Number(movie.maxPrice || movie.minPrice || 0))
    })

    return {
      genres: [...genres].sort(),
      languages: [...languages].sort(),
      releaseYears: [...releaseYears].filter(Boolean).sort((a, b) => b - a),
      maxMoviePrice,
    }
  }, [shows])

  const filteredShows = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const minRating = Number(filters.rating || 0)
    const maxPrice = Number(filters.maxPrice || 0)

    return shows.filter((movie) => {
      const titleMatch = !search || movie.title?.toLowerCase().includes(search)
      const genreMatch = !filters.genre || movie.genres?.some((genre) => genre.name === filters.genre)
      const languageMatch = !filters.language || movie.original_language?.toUpperCase() === filters.language
      const ratingMatch = !filters.rating || Number(movie.vote_average || 0) >= minRating
      const releaseYearMatch = !filters.releaseYear || String(new Date(movie.release_date).getFullYear()) === filters.releaseYear
      const priceMatch = !filters.maxPrice || Number(movie.minPrice || 0) <= maxPrice
      const timingMatch = !filters.showTiming || movie.availableShows?.some((show) => getShowTiming(show.showDateTime) === filters.showTiming)

      return titleMatch && genreMatch && languageMatch && ratingMatch && releaseYearMatch && priceMatch && timingMatch
    })
  }, [shows, filters])

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return shows.length > 0 ? (
    <main className="relative px-6 pt-32 pb-24 md:px-16 lg:px-36 overflow-hidden min-h-[80vh]">
      {shows.length > 0 ? (
        <>
          <BlurCircle top="150px" left="0px" />
          <BlurCircle bottom="50px" right="50px" />
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary">Movie catalog</p>
                <h1 className="text-3xl font-bold text-white md:text-4xl">Find Your Next Show</h1>
              </div>
              <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">{filteredShows.length} of {shows.length} movies</p>
            </div>

            <div className="glass-panel rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <p className="font-medium">Search & Filters</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="ml-auto flex items-center gap-1 text-sm text-gray-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 border border-gray-700 rounded-md px-3 py-2 sm:col-span-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                    placeholder="Search movie"
                    className="bg-transparent outline-none w-full text-sm"
                  />
                </label>

                <select value={filters.genre} onChange={(e) => updateFilter("genre", e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm outline-none">
                  <option value="">All genres</option>
                  {filterOptions.genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                </select>

                <select value={filters.language} onChange={(e) => updateFilter("language", e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm outline-none">
                  <option value="">All languages</option>
                  {filterOptions.languages.map((language) => <option key={language} value={language}>{language}</option>)}
                </select>

                <select value={filters.rating} onChange={(e) => updateFilter("rating", e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm outline-none">
                  <option value="">Any rating</option>
                  <option value="8">8+ rating</option>
                  <option value="7">7+ rating</option>
                  <option value="6">6+ rating</option>
                </select>

                <select value={filters.releaseYear} onChange={(e) => updateFilter("releaseYear", e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm outline-none">
                  <option value="">Any release year</option>
                  {filterOptions.releaseYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>

                <select value={filters.showTiming} onChange={(e) => updateFilter("showTiming", e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm outline-none">
                  <option value="">Any show time</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>

                <label className="border border-gray-700 rounded-md px-3 py-2 text-sm">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>Max price</span>
                    <span>{filters.maxPrice ? `${currency}${filters.maxPrice}` : "Any"}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(filterOptions.maxMoviePrice, 1)}
                    value={filters.maxPrice || filterOptions.maxMoviePrice}
                    onChange={(e) => updateFilter("maxPrice", e.target.value)}
                    className="w-full accent-primary"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* GRID with 4 per row */}
          {filteredShows.length > 0 ? (
            <div className="mx-auto mt-8 grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredShows.map((movie) => (
              <MovieCard movie={movie} key={movie._id} />
            ))}
            </div>
          ) : (
            <div className="cinema-card mx-auto mt-8 flex min-h-80 max-w-7xl items-center justify-center rounded-lg">
              <p className="text-gray-400">No movies match your filters.</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-3xl font-bold text-center">
            No movies available at the moment.
          </h1>
        </div>
      )}
    </main>
  ) : (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-white">
        No movies available at the moment.
      </h1>
      <p className="mt-3 max-w-md text-gray-400">Ask an admin to add future shows and they will appear here.</p>
    </main>
  )
}

export default Movies
