import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUser, useAuth } from "@clerk/clerk-react";

// ✅ Create Axios instance with baseURL
const axiosInstance = axios.create({
    baseURL: "http://localhost:3000/api", // adjust if needed for production
});

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [shows, setShows] = useState([]);
    const [favoriteMovies, setFavoriteMovies] = useState([]);
    
    const image_base_url=import.meta.env.VITE_TMDB_IMAGE_BASE_URL


    const { user } = useUser();
    const { getToken } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // ✅ Check if user is admin
    const fetchIsAdmin = async () => {
        try {
            const token = await getToken();
            const { data } = await axiosInstance.get("/admin/is-admin", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setIsAdmin(data.isAdmin);

            if (!data.isAdmin && location.pathname.startsWith("/admin")) {
                navigate("/");
                toast.error("You are not authorized to access admin Dashboard.");
            }
        } catch (error) {
            console.error("Error fetching admin status:", error);
        }
    };

    // ✅ Fetch all shows
    const fetchShows = async () => {
        try {
            const { data } = await axiosInstance.get("/show/all");
            if (data.success) {
                setShows(data.shows);
            } else {
                toast.error(data.message || "Failed to fetch shows");
            }
        } catch (error) {
            console.error("Error fetching shows:", error);
            toast.error("Failed to fetch shows");
        }
    };

    // ✅ Fetch favorite movies
    const fetchFavoriteMovies = async () => {
        try {
            const token = await getToken();
            const { data } = await axiosInstance.get("/user/favorites", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (data.success) {
                setFavoriteMovies(data.movies);
            } else {
                toast.error(data.message || "Failed to fetch favorites");
            }
        } catch (error) {
            console.error("Error fetching favorite movies:", error);
        }
    };

    // ✅ Run once on mount
    useEffect(() => {
        fetchShows();
    }, []);

    // ✅ Run when user changes (login/logout)
    useEffect(() => {
        if (user) {
            fetchIsAdmin();
            fetchFavoriteMovies();
        }
    }, [user]);

    const value = {
        axiosInstance,
        user,
        getToken,
        navigate,
        isAdmin,
        shows,
        favoriteMovies,
        fetchIsAdmin,
        fetchFavoriteMovies,
        fetchShows,
        image_base_url
    };

    return (
        <AppContext.Provider value={value}>{children}</AppContext.Provider>
    );
};

// ✅ Custom hook
const useAppContext = () => useContext(AppContext);

export { AppProvider, useAppContext };
