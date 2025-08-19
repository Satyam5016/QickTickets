import React, { useState, useEffect } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import isoTimeFormat from '../lib/isoTimeFormat'
import { dateFormat } from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'

const currency = import.meta.env.VITE_CURRENCY || "₹"; // fallback if not defined

const MyBookings = () => {
  const { axiosInstance, getToken, user, image_base_url } = useAppContext();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getMyBookings = async () => {
    try {
      const { data } = await axiosInstance.get('/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });

      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getMyBookings();
    }
  }, [user]);

  if (isLoading) return <Loading />;

  return (
    <div className='relative px-6 md:px-16 lg:px-40 pt-32 md:pt-40 min-h-[80vh]'>
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings found.</p>
      ) : (
        bookings.map((item) => (
          <div
            key={item._id || item.id} // safer than index
            className='flex flex-col md:flex-row justify-between bg-primary/10 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl'
          >
            <div className='flex flex-col md:flex-row'>
              <img
                src={item?.show?.movie?.poster_path ? image_base_url + item.show.movie.poster_path : "/fallback-poster.jpg"}
                alt={item?.show?.movie?.title || "Movie Poster"}
                className='md:max-w-48 aspect-video h-auto object-cover object-bottom rounded'
              />
              <div className='flex flex-col p-4'>
                <p className='text-lg font-semibold'>{item?.show?.movie?.title || "Unknown Movie"}</p>
                <p className='text-gray-400 text-sm'>
                  {item?.show?.movie?.runtime ? isoTimeFormat(item.show.movie.runtime) : "N/A"}
                </p>
                <p className='text-gray-400 text-sm mt-auto'>
                  {item?.show?.showDateTime ? dateFormat(item.show.showDateTime) : "N/A"}
                </p>
              </div>
            </div>

            <div className='flex flex-col md:items-end md:text-right justify-between p-4'>
              <div className='flex items-center gap-4'>
                <p className='text-2xl font-semibold mb-3'>
                  {currency}{item.amount}
                </p>
                {/* ✅ FIX: use <a> instead of <Link> so Stripe Checkout actually opens */}
                {!item.isPaid && item.paymentLink && (
                  <a
                    href={item.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer'
                  >
                    Pay Now
                  </a>
                )}
                {item.isPaid && (
                  <span className="text-green-600 font-medium mb-3">Paid ✅</span>
                )}
              </div>
              <div className='text-sm'>
                <p>
                  <span className='text-gray-400'>Total Tickets:</span>{" "}
                  {item.bookedSeats?.length || 0}
                </p>
                <p>
                  <span className='text-gray-400'>Seat Number:</span>{" "}
                  {item.bookedSeats?.join(", ") || "N/A"}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookings;
