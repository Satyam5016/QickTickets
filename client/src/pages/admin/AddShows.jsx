import React, { useState, useEffect } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { StarIcon } from "@heroicons/react/24/outline";
import { kFormatter } from "../../lib/kConverter";
import { CheckIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const AddShows = () => {
    const { axiosInstance, getToken, image_base_url } = useAppContext();

    const currency = String(import.meta.env.VITE_CURRENCY || "$").replace(/['"]/g, "").trim() || "$";
    const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [dateTimeSelection, setDateTimeSelection] = useState({});
    const [dateTimeInput, setDateTimeInput] = useState("");
    const [venue, setVenue] = useState({
        city: "Mumbai",
        theater: "QuickTickets Cinema",
        screen: "Screen 1",
    });
    const [seatCategoryPrices, setSeatCategoryPrices] = useState({
        Regular: "",
        Premium: "",
        Recliner: "",
        VIP: "",
    });
    const [addingShow, setAddingShow] = useState(false);
    const [isFetchingMovies, setIsFetchingMovies] = useState(true);
    const [moviesError, setMoviesError] = useState("");
    const seatCategories = [
        { name: "Regular", hint: "Front rows" },
        { name: "Premium", hint: "Middle rows" },
        { name: "Recliner", hint: "Comfort seats" },
        { name: "VIP", hint: "Best view" },
    ];

    // Fetch Now Playing Movies
    const fetchNowPlayingMovies = async () => {
        try {
            setIsFetchingMovies(true);
            setMoviesError("");
            const { data } = await axiosInstance.get("/show/now-playing");

            if (data.success) {
                setNowPlayingMovies(data.movies);
            } else {
                console.error("Failed to fetch movies:", data.message);
                setMoviesError(data.message || "Failed to fetch movies from TMDB.");
            }
        } catch (error) {
            console.error("Error fetching movies:", error);
            setMoviesError("Unable to reach the movie API.");
        } finally {
            setIsFetchingMovies(false);
        }
    };

    const handleDateTimeAdd = () => {
        if (!dateTimeInput) return;
        const [date, time] = dateTimeInput.split("T");
        if (!date || !time) return;

        setDateTimeSelection((prev) => {
            const times = prev[date] || [];
            if (!times.includes(time)) {
                return { ...prev, [date]: [...times, time] };
            }
            return prev;
        });
    };

    const handleRemoveTime = (date, time) => {
        setDateTimeSelection((prev) => {
            const times = prev[date].filter((t) => t !== time);
            if (times.length === 0) {
                const { [date]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [date]: times };
        });
    };

    const handleSubmit = async () => {
        const hasInvalidPrice = seatCategories.some(({ name }) => {
            const price = Number(seatCategoryPrices[name]);
            return !Number.isFinite(price) || price <= 0;
        });

        if (!selectedMovie || Object.keys(dateTimeSelection).length === 0 || hasInvalidPrice || !venue.city || !venue.theater || !venue.screen) {
            return toast.error("Select a movie, add showtimes, and enter a price above 0 for every seat category.");
        }

        try {
            setAddingShow(true);

            // Keep time as array to match backend expectation
            const showsInput = Object.entries(dateTimeSelection).map(([date, times]) => ({
                date,
                time: times,
            }));

            const payload = {
                movieId: selectedMovie,
                showsInput,
                showPrice: Number(seatCategoryPrices.Regular),
                city: venue.city,
                theater: venue.theater,
                screen: venue.screen,
                seatCategoryPrices: Object.fromEntries(
                    seatCategories.map(({ name }) => [name, Number(seatCategoryPrices[name])])
                ),
            };

            const { data } = await axiosInstance.post("/show/add", payload, {
                headers: { Authorization: `Bearer ${await getToken()}` },
            });

            if (data.success) {
                toast.success(data.message);
                setSelectedMovie(null);
                setDateTimeSelection({});
                setSeatCategoryPrices({
                    Regular: "",
                    Premium: "",
                    Recliner: "",
                    VIP: "",
                });
                setDateTimeInput("");
                setVenue({
                    city: "Mumbai",
                    theater: "QuickTickets Cinema",
                    screen: "Screen 1",
                });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An error occurred. Please try again.");
        }

        setAddingShow(false);
    };

    const setSeatCategoryPrice = (category, value) => {
        if (Number(value) < 0) return;
        setSeatCategoryPrices((prev) => ({
            ...prev,
            [category]: value,
        }));
    };

    const applyRegularPriceToAll = () => {
        const regularPrice = seatCategoryPrices.Regular;
        if (!regularPrice || Number(regularPrice) <= 0) {
            return toast.error("Enter a regular seat price first.");
        }

        setSeatCategoryPrices({
            Regular: regularPrice,
            Premium: regularPrice,
            Recliner: regularPrice,
            VIP: regularPrice,
        });
    };

    useEffect(() => {
        fetchNowPlayingMovies();
    }, []);

    if (isFetchingMovies) return <Loading />;

    return (
        <>
            <Title text1="Add" text2="Shows" />

            {/* Movies List */}
            <p className="mt-10 text-lg font-medium">Now Playing Movies</p>
            {moviesError && (
                <div className="mt-4 max-w-3xl rounded-md border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">
                    {moviesError} Check `TMDB_API_KEY` and backend network access, then retry.
                    <button onClick={fetchNowPlayingMovies} className="ml-3 font-semibold text-white underline">
                        Retry
                    </button>
                </div>
            )}
            <div className="overflow-x-auto pb-4">
                <div className="group flex flex-wrap gap-4 mt-4">
                    {nowPlayingMovies.map((movie) => (
                        <div
                            key={movie.id}
                            className="relative max-w-40 cursor-pointer group-hover:not-hover:opacity-40 hover:translate-y-1 transition duration-300"
                            onClick={() => setSelectedMovie(movie.id)}
                        >
                            <div className="relative rounded-lg overflow-hidden">
                                <img
                                    src={`${image_base_url}${movie.poster_path}`}
                                    alt={movie.title || "Movie poster"}
                                    className="w-full object-cover brightness-90"
                                />
                                <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                                    <p className="flex items-center gap-1 text-gray-400">
                                        <StarIcon className="w-4 h-4 text-primary fill-primary" />
                                        {movie.vote_average.toFixed(1)}
                                    </p>
                                    <p className="text-gray-300">{kFormatter(movie.vote_count)} Votes</p>
                                </div>
                            </div>
                            {selectedMovie === movie.id && (
                                <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                                    <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                                </div>
                            )}
                            <p className="font-medium truncate">{movie.title}</p>
                            <p className="text-gray-400 text-sm">{movie.release_date}</p>
                        </div>
                    ))}
                </div>
                {!moviesError && nowPlayingMovies.length === 0 && (
                    <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-5 text-sm text-gray-400">
                        TMDB did not return any now-playing movies.
                    </div>
                )}
            </div>

            {/* Seat Category Price Inputs */}
            <div className="mt-8">
                <label className="block text-sm font-medium mb-2">Theater Location</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
                    <input
                        value={venue.city}
                        onChange={(e) => setVenue((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        className="border border-gray-600 px-3 py-2 rounded-md outline-none bg-transparent"
                    />
                    <input
                        value={venue.theater}
                        onChange={(e) => setVenue((prev) => ({ ...prev, theater: e.target.value }))}
                        placeholder="Theater"
                        className="border border-gray-600 px-3 py-2 rounded-md outline-none bg-transparent"
                    />
                    <input
                        value={venue.screen}
                        onChange={(e) => setVenue((prev) => ({ ...prev, screen: e.target.value }))}
                        placeholder="Screen"
                        className="border border-gray-600 px-3 py-2 rounded-md outline-none bg-transparent"
                    />
                </div>
            </div>

            {/* Seat Category Price Inputs */}
            <div className="mt-8 max-w-5xl rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <label className="block text-sm font-semibold">Seat Category Prices</label>
                        <p className="mt-1 text-xs text-gray-400">Set the ticket price for each seat type. All values must be greater than 0.</p>
                    </div>
                    <button
                        type="button"
                        onClick={applyRegularPriceToAll}
                        className="inline-flex w-max items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                    >
                        <CopyIcon className="h-4 w-4" />
                        Copy Regular to All
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {seatCategories.map(({ name, hint }) => {
                        const value = seatCategoryPrices[name];
                        const isInvalid = value !== "" && Number(value) <= 0;

                        return (
                            <div key={name} className={`rounded-md border p-4 transition ${isInvalid ? "border-red-400/40 bg-red-500/10" : "border-white/10 bg-black/20"}`}>
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold">{name}</p>
                                        <p className="text-xs text-gray-500">{hint}</p>
                                    </div>
                                    <span className="rounded bg-white/5 px-2 py-1 text-xs text-gray-400">{currency}</span>
                                </div>
                                <div className="flex h-11 items-center rounded-md border border-white/10 bg-[#0b0d13] px-3 focus-within:border-primary/60">
                                    <span className="mr-2 text-sm text-gray-500">{currency}</span>
                                    <input
                                        min={1}
                                        step={1}
                                        type="number"
                                        value={value}
                                        onChange={(e) => setSeatCategoryPrice(name, e.target.value)}
                                        placeholder="Enter price"
                                        className="w-full min-w-0 bg-transparent text-base font-semibold outline-none placeholder:text-sm placeholder:font-normal placeholder:text-gray-600"
                                    />
                                </div>
                                {isInvalid && <p className="mt-2 text-xs text-red-300">Price must be greater than 0.</p>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Date-Time Selection */}
            <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Select Date and Time</label>
                <div className="inline-flex gap-5 border border-gray-600 p-1 pl-3 rounded-lg">
                    <input
                        type="datetime-local"
                        value={dateTimeInput}
                        onChange={(e) => setDateTimeInput(e.target.value)}
                        className="outline-none rounded-md bg-transparent"
                    />
                    <button
                        onClick={handleDateTimeAdd}
                        className="bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer"
                    >
                        Add Time
                    </button>
                </div>
            </div>

            {/* Selected Date-Time List */}
            {Object.keys(dateTimeSelection).length > 0 && (
                <div className="mt-6">
                    <h2 className="mb-2 font-medium">Selected Date-Time</h2>
                    <ul className="space-y-3">
                        {Object.entries(dateTimeSelection).map(([date, times]) => (
                            <li key={date}>
                                <div className="font-medium">{date}</div>
                                <div className="flex flex-wrap gap-2 mt-1 text-sm">
                                    {times.map((time) => (
                                        <div
                                            key={time}
                                            className="border border-primary px-2 py-1 flex items-center rounded"
                                        >
                                            <span>{time}</span>
                                            <Trash2Icon
                                                onClick={() => handleRemoveTime(date, time)}
                                                width={15}
                                                className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={addingShow}
                className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
            >
                {addingShow ? "Adding..." : "Add Show"}
            </button>
        </>
    );
};

export default AddShows;
