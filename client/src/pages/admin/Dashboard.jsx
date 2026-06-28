import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Title from '../../components/admin/Title';
import Loading from '../../components/Loading';
import BlurCircle from '../../components/BlurCircle';
import toast from 'react-hot-toast';

// Heroicons
import {
    ChartPieIcon,
    CurrencyDollarIcon,
    PlayCircleIcon,
    UserGroupIcon,
    StarIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

import { dateFormat } from '../../lib/dateFormat';

const Dashboard = () => {
    const { axiosInstance, getToken, image_base_url, user } = useAppContext();
    const currency = import.meta.env.VITE_CURRENCY;

    const [dashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        activeShows: [],
        totalUsers: 0,
        cancelledBookings: 0,
        occupancyRate: 0,
        totalBookedSeats: 0,
        totalSeatCapacity: 0,
        analytics: {
            dailyBookings: [],
            mostBookedMovies: []
        }
    });
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const token = await getToken();
            const { data } = await axiosInstance.get("/admin/dashboard", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setDashboardData(data.dashboardData);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast.error("Error fetching dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const dashboardCards = [
        { title: "Total Bookings", value: dashboardData.totalBookings || 0, icon: ChartPieIcon },
        { title: "Total Revenue", value: `${currency}${dashboardData.totalRevenue || 0}`, icon: CurrencyDollarIcon },
        { title: "Active Shows", value: dashboardData.activeShows?.length || 0, icon: PlayCircleIcon },
        { title: "Total Users", value: dashboardData.totalUsers || 0, icon: UserGroupIcon },
        { title: "Occupancy Rate", value: `${dashboardData.occupancyRate || 0}%`, icon: ChartPieIcon },
        { title: "Cancelled Bookings", value: dashboardData.cancelledBookings || 0, icon: XCircleIcon }
    ];

    const maxDailyBookings = Math.max(...(dashboardData.analytics?.dailyBookings || []).map((item) => item.bookings), 1);
    const maxMovieSeats = Math.max(...(dashboardData.analytics?.mostBookedMovies || []).map((item) => item.seats), 1);

    if (loading) return <Loading />;

    return (
        <div className="p-6 relative">
            <Title text1="Admin" text2="Dashboard" />

            {/* Dashboard cards */}
            <div className="relative flex flex-wrap gap-4 mt-6">
                <BlurCircle top="-100px" left="0" />
                <div className="flex flex-wrap gap-4 w-full">
                    {dashboardCards.map((card, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 rounded-md w-full md:w-60"
                        >
                            <div>
                                <h1 className="text-sm">{card.title}</h1>
                                <p className="text-xl font-medium mt-1">{card.value}</p>
                            </div>
                            <card.icon className="w-6 h-6 text-primary" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Analytics */}
            <p className="mt-10 text-lg font-medium">Analytics</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4 max-w-6xl">
                <div className="border border-primary/20 bg-primary/5 rounded-md p-4">
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div>
                            <p className="font-medium">Daily Bookings</p>
                            <p className="text-sm text-gray-400">Last 7 booking days</p>
                        </div>
                    </div>
                    {dashboardData.analytics?.dailyBookings?.length > 0 ? (
                        <div className="h-64 flex items-end gap-3">
                            {dashboardData.analytics.dailyBookings.map((item) => (
                                <div key={item.date} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                    <div className="text-xs text-gray-300">{item.bookings}</div>
                                    <div
                                        className="w-full rounded-t bg-primary min-h-2"
                                        style={{ height: `${Math.max((item.bookings / maxDailyBookings) * 190, 8)}px` }}
                                        title={`${item.bookings} bookings, ${currency}${item.revenue}`}
                                    />
                                    <div className="text-[10px] text-gray-500">{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No paid bookings yet.</p>
                    )}
                </div>

                <div className="border border-primary/20 bg-primary/5 rounded-md p-4">
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div>
                            <p className="font-medium">Most Booked Movies</p>
                            <p className="text-sm text-gray-400">Ranked by seats sold</p>
                        </div>
                    </div>
                    {dashboardData.analytics?.mostBookedMovies?.length > 0 ? (
                        <div className="space-y-4">
                            {dashboardData.analytics.mostBookedMovies.map((movie) => (
                                <div key={movie.movieTitle}>
                                    <div className="flex justify-between gap-3 text-sm mb-1">
                                        <span className="truncate">{movie.movieTitle}</span>
                                        <span className="text-gray-400 shrink-0">{movie.seats} seats</span>
                                    </div>
                                    <div className="h-3 rounded bg-gray-800 overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded"
                                            style={{ width: `${Math.max((movie.seats / maxMovieSeats) * 100, 4)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{movie.bookings} bookings · {currency}{movie.revenue}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No movie booking data yet.</p>
                    )}
                </div>

                <div className="border border-primary/20 bg-primary/5 rounded-md p-4">
                    <p className="font-medium">Occupancy Rate</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {dashboardData.totalBookedSeats || 0} of {dashboardData.totalSeatCapacity || 0} seats booked
                    </p>
                    <div className="mt-6 flex items-center gap-6">
                        <div className="relative h-32 w-32 rounded-full bg-gray-800">
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{ background: `conic-gradient(#F84565 ${(dashboardData.occupancyRate || 0) * 3.6}deg, #1f2937 0deg)` }}
                            />
                            <div className="absolute inset-4 bg-[#09090B] rounded-full flex items-center justify-center">
                                <span className="text-2xl font-semibold">{dashboardData.occupancyRate || 0}%</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400">
                            <p>Capacity assumes 90 seats per show.</p>
                            <p className="mt-2 text-white">{dashboardData.activeShows?.length || 0} active shows</p>
                        </div>
                    </div>
                </div>

                <div className="border border-primary/20 bg-primary/5 rounded-md p-4">
                    <p className="font-medium">Cancelled Bookings</p>
                    <p className="text-sm text-gray-400 mt-1">Approved cancellations across all bookings</p>
                    <div className="mt-8 flex items-end gap-4">
                        <p className="text-5xl font-semibold text-red-400">{dashboardData.cancelledBookings || 0}</p>
                        <p className="text-sm text-gray-400 pb-2">cancelled booking{dashboardData.cancelledBookings === 1 ? "" : "s"}</p>
                    </div>
                </div>
            </div>

            {/* Active Shows */}
            <p className="mt-10 text-lg font-medium">Active Shows</p>
            <div className="relative flex flex-wrap gap-6 mt-4 max-w-5xl">
                <BlurCircle top="100px" left="-10%" />
                {dashboardData.activeShows?.length === 0 ? (
                    <p className="text-gray-500">No active shows available.</p>
                ) : (
                    dashboardData.activeShows.map((show) => (
                        <div
                            key={show._id}
                            className="w-56 rounded-lg overflow-hidden bg-primary/10 border border-primary/20 hover:-translate-y-1 transition duration-300"
                        >
                            <img
                                src={show.movie?.poster_path ? `${image_base_url}${show.movie.poster_path}` : ''}
                                alt={show.movie?.title || 'Untitled'}
                                className="h-60 w-full object-cover"
                            />
                            <p className="font-medium p-2 truncate">{show.movie?.title || "Untitled"}</p>
                            <p className="px-2 text-xs text-gray-400 truncate">
                                {[show.city, show.theater, show.screen].filter(Boolean).join(" · ")}
                            </p>
                            <div className="flex items-center justify-between px-2">
                                <p className="text-lg font-medium">{currency} {show.showPrice || 0}</p>
                                <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
                                    <StarIcon className="w-4 h-4 text-primary" />
                                    {show.movie?.vote_average?.toFixed(1) || "N/A"}
                                </p>
                            </div>
                            <p className="px-2 pb-2">{dateFormat(show.showDateTime)}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Dashboard;
