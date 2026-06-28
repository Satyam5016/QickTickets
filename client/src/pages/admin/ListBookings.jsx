import React, { useEffect, useState } from 'react'
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { dateFormat } from '../../lib/dateFormat';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ListBookings = () => {
    const { axiosInstance, getToken, user } = useAppContext();
    const currency = import.meta.env.VITE_CURRENCY

    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewingId, setReviewingId] = useState("");

    const getAllBookings = async () => {
        try {
            const { data } = await axiosInstance.get("/admin/all-bookings", {
                headers: { Authorization: `Bearer ${await getToken()}` }
            });
            setBookings(data.bookings);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) {
            getAllBookings();
        }
    }, [user]);

    const getStatusLabel = (booking) => {
        if (booking.status === "cancel_requested") return "Cancellation Pending";
        if (booking.status === "cancelled") {
            return booking.refundStatus === "manual_required" ? "Cancelled - Manual Refund" : "Cancelled";
        }
        if (booking.status === "cancel_rejected") return "Cancellation Rejected";
        return booking.isPaid ? "Confirmed" : "Payment Pending";
    };

    const reviewCancellation = async (bookingId, action) => {
        const note = window.prompt(action === "approve" ? "Admin note (optional):" : "Reason for rejection (optional):");
        if (note === null) return;

        try {
            setReviewingId(bookingId);
            const { data } = await axiosInstance.patch(`/admin/bookings/${bookingId}/cancellation`, { action, note }, {
                headers: { Authorization: `Bearer ${await getToken()}` }
            });

            if (data.success) {
                toast.success(data.message);
                getAllBookings();
            } else {
                toast.error(data.message || "Unable to review request");
            }
        } catch (error) {
            console.error("Error reviewing cancellation:", error);
            toast.error("Unable to review request");
        } finally {
            setReviewingId("");
        }
    };

    return !isLoading ? (
        <>
            <Title text1="List" text2="Bookings" />
            <div className="max-w-6xl mt-6 overflow-x-auto">
                <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
                    <thead>
                        <tr className="bg-primary/20 text-left text-white">
                            <th className="p-2 font-medium pl-5">User Name</th>
                            <th className="p-2 font-medium">Movie Name</th>
                            <th className="p-2 font-medium">Show Time</th>
                            <th className="p-2 font-medium">Seats</th>
                            <th className="p-2 font-medium">Amount</th>
                            <th className="p-2 font-medium">Status</th>
                            <th className="p-2 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-light">
                        {bookings.map((item) => (
                            <tr key={item._id} className="border-b border-primary/20 bg-primary/5 even:bg-primary/10">
                                <td className="p-2 min-w-45 pl-5">{item.user?.name}</td>
                                <td className="p-2">{item.show?.movie?.title}</td>
                                <td className="p-2">{dateFormat(item.show?.showDateTime)}</td>
                                <td className="p-2">
                                    {Object.values(item.bookedSeats).join(", ")}
                                </td>
                                <td className="p-2">{currency} {item.amount}</td>
                                <td className="p-2">
                                    <span className={item.status === "cancelled" ? "text-red-400" : item.status === "cancel_requested" ? "text-yellow-400" : "text-green-400"}>
                                        {getStatusLabel(item)}
                                    </span>
                                    {item.cancellationReason && (
                                        <p className="text-xs text-gray-400 max-w-44 truncate">Reason: {item.cancellationReason}</p>
                                    )}
                                </td>
                                <td className="p-2">
                                    {item.status === "cancel_requested" ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => reviewCancellation(item._id, "approve")}
                                                disabled={reviewingId === item._id}
                                                className="bg-green-600 px-3 py-1 rounded text-xs font-medium disabled:opacity-60"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => reviewCancellation(item._id, "reject")}
                                                disabled={reviewingId === item._id}
                                                className="bg-red-600 px-3 py-1 rounded text-xs font-medium disabled:opacity-60"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    ) : <Loading />
}

export default ListBookings;
