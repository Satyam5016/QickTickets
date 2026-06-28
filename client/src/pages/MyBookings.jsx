import React, { useState, useEffect } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat'
import { dateFormat } from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { Armchair, CalendarDays, Download, MapPin, ReceiptText, TicketCheck, Utensils } from 'lucide-react'

const getTicketCode = (booking) => booking.ticketCode || `QT-${booking._id}`

const getTicketPayload = (booking) => JSON.stringify({
  ticketCode: getTicketCode(booking),
  bookingId: booking._id,
  movie: booking.show?.movie?.title,
  showTime: booking.show?.showDateTime,
  city: booking.show?.city,
  theater: booking.show?.theater,
  screen: booking.show?.screen,
  seats: booking.bookedSeats,
  foodItems: booking.foodItems,
})

const getQrImage = async (booking, width = 180) => (
  QRCode.toDataURL(getTicketPayload(booking), {
    width,
    margin: 1,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  })
)

const MyBookings = () => {

  const { axiosInstance, getToken, user, image_base_url } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [requestingId, setRequestingId] = useState("")
  const [downloadingId, setDownloadingId] = useState("")

  const getMyBookings = async () => {
    try {
      const { data } = await axiosInstance.get('/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });

      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getMyBookings()
    }
  }, [user])

  const getBookingStatusLabel = (booking) => {
    if (booking.status === "cancel_requested") return "Cancellation Pending";
    if (booking.status === "cancelled") {
      return booking.refundStatus === "manual_required" ? "Cancelled - Manual Refund" : "Cancelled";
    }
    if (booking.status === "cancel_rejected") return "Cancellation Rejected";
    return booking.isPaid ? "Confirmed" : "Payment Pending";
  };

  const canRequestCancellation = (booking) => {
    const showTime = new Date(booking.show?.showDateTime).getTime();
    return booking.status !== "cancel_requested"
      && booking.status !== "cancelled"
      && Number.isFinite(showTime)
      && showTime > Date.now();
  };

  const canDownloadTicket = (booking) => {
    return booking.isPaid && booking.status !== "cancelled" && booking.status !== "cancel_requested";
  };

  const canPayNow = (booking) => {
    return !booking.isPaid
      && Boolean(booking.paymentLink)
      && (!booking.status || booking.status === "booked");
  };

  const getStatusClass = (booking) => {
    if (booking.status === "cancelled") return "border-red-400/25 bg-red-500/10 text-red-300";
    if (booking.status === "cancel_requested") return "border-yellow-400/25 bg-yellow-500/10 text-yellow-200";
    if (booking.isPaid) return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
    return "border-orange-400/25 bg-orange-500/10 text-orange-300";
  };

  const requestCancellation = async (bookingId) => {
    const reason = window.prompt("Reason for cancellation (optional):");
    if (reason === null) return;
    try {
      setRequestingId(bookingId);
      const { data } = await axiosInstance.post(`/user/bookings/${bookingId}/cancel`, { reason }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });

      if (data.success) {
        toast.success(data.message);
        getMyBookings();
      } else {
        toast.error(data.message || "Unable to request cancellation");
      }
    } catch (error) {
      console.log(error);
      toast.error("Unable to request cancellation");
    } finally {
      setRequestingId("");
    }
  };

  const downloadTicketPdf = async (booking) => {
    try {
      setDownloadingId(booking._id)
      const { jsPDF } = await import('jspdf')
      const qrImage = await getQrImage(booking, 220)
      const doc = new jsPDF({ unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 44
      const movieTitle = booking.show?.movie?.title || "Movie Ticket"
      const showDate = dateFormat(booking.show?.showDateTime)
      const venueText = [booking.show?.city, booking.show?.theater, booking.show?.screen].filter(Boolean).join(" · ")
      const ticketCode = getTicketCode(booking)
      const seatsText = booking.bookedSeats?.join(", ") || "-"
      const categoriesText = booking.bookedSeatDetails?.length
        ? booking.bookedSeatDetails.map((seat) => `${seat.seat} ${seat.category} (${currency}${seat.price})`).join(", ")
        : seatsText
      const foodText = booking.foodItems?.length
        ? booking.foodItems.map((food) => `${food.name} x${food.quantity}`).join(", ")
        : "None"

      doc.setFillColor(248, 69, 101)
      doc.rect(0, 0, pageWidth, 92, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(24)
      doc.text("QuickTickets", margin, 38)
      doc.setFontSize(13)
      doc.setFont("helvetica", "normal")
      doc.text("Booking Invoice / PDF Ticket", margin, 64)

      doc.setTextColor(17, 24, 39)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      doc.text(movieTitle, margin, 136, { maxWidth: pageWidth - margin * 2 - 150 })

      doc.addImage(qrImage, "PNG", pageWidth - margin - 118, 118, 118, 118)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(75, 85, 99)
      doc.text(ticketCode, pageWidth - margin - 118, 252, { maxWidth: 118, align: "center" })

      const rows = [
        ["Ticket Code", ticketCode],
        ["Booking ID", booking._id],
        ["Show Date", showDate],
        ["Venue", venueText || "-"],
        ["Seats", seatsText],
        ["Seat Details", categoriesText],
        ["Food & Beverages", foodText],
        ["Seats Amount", `${currency}${booking.seatsAmount || booking.amount}`],
        ["Food Amount", `${currency}${booking.foodAmount || 0}`],
        ["Discount", `${booking.discountAmount > 0 ? "-" : ""}${currency}${booking.discountAmount || 0}${booking.coupon?.code ? ` (${booking.coupon.code})` : ""}`],
        ["Total Paid", `${currency}${booking.amount}`],
        ["Status", getBookingStatusLabel(booking)],
      ]

      let y = 292
      doc.setFontSize(11)
      rows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold")
        doc.setTextColor(75, 85, 99)
        doc.text(label, margin, y)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(17, 24, 39)
        const splitValue = doc.splitTextToSize(String(value), pageWidth - margin * 2 - 150)
        doc.text(splitValue, margin + 150, y)
        y += Math.max(24, splitValue.length * 14)
      })

      doc.setDrawColor(229, 231, 235)
      doc.line(margin, y + 8, pageWidth - margin, y + 8)
      doc.setFontSize(10)
      doc.setTextColor(107, 114, 128)
      doc.text("Show this PDF or the QR code at the cinema entry gate.", margin, y + 34)

      doc.save(`QuickTickets-${ticketCode}.pdf`)
    } catch (error) {
      console.error("Error generating PDF ticket:", error)
      toast.error("Unable to generate PDF ticket")
    } finally {
      setDownloadingId("")
    }
  };

  if (isLoading) return <Loading />

  return (
    <main className='relative min-h-[80vh] px-6 pt-32 pb-24 md:px-16 lg:px-36'>
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <div className='mx-auto max-w-6xl'>
      <div className='mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary'>Tickets & orders</p>
          <h1 className='text-3xl font-bold md:text-4xl'>My Bookings</h1>
        </div>
        <p className='text-sm text-gray-400'>{bookings.length} booking{bookings.length === 1 ? "" : "s"}</p>
      </div>

      {bookings.length === 0 ? (
        <div className="cinema-card flex min-h-64 flex-col items-center justify-center rounded-lg px-6 text-center">
          <TicketCheck className='mb-4 h-10 w-10 text-primary' />
          <h2 className='text-xl font-semibold'>No bookings yet</h2>
          <p className="mt-2 max-w-md text-gray-400">Book a movie and your tickets, food orders, and invoices will appear here.</p>
        </div>
      ) : (
        bookings.map((item) => (
          <div
            key={item._id}
            className='cinema-card mb-5 grid overflow-hidden rounded-lg md:grid-cols-[220px_1fr]'
          >
            <img
              src={image_base_url + item.show.movie.poster_path}
              alt={item.show.movie.title}
              className='h-72 w-full object-cover md:h-full'
            />

            <div className='grid gap-5 p-5 lg:grid-cols-[1fr_240px]'>
              <div className='flex min-w-0 flex-col'>
                <div className='mb-4 flex flex-wrap items-center gap-3'>
                  <span className={`rounded-md border px-3 py-1 text-xs font-semibold ${getStatusClass(item)}`}>
                    {getBookingStatusLabel(item)}
                  </span>
                  <span className='text-xs text-gray-500'>Booking #{item._id.slice(-8).toUpperCase()}</span>
                  {item.isPaid && (
                    <span className='rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300'>
                      Ticket {getTicketCode(item)}
                    </span>
                  )}
                </div>

                <h2 className='text-2xl font-semibold'>{item.show.movie.title}</h2>
                <p className='mt-1 text-sm text-gray-400'>{timeFormat(item.show.movie.runtime)}</p>

                <div className='mt-5 grid gap-3 text-sm text-gray-300 xl:grid-cols-2'>
                  <p className='flex items-center gap-2'>
                    <CalendarDays className='h-4 w-4 shrink-0 text-primary' />
                    {dateFormat(item.show.showDateTime)}
                  </p>
                  <p className='flex items-center gap-2'>
                    <MapPin className='h-4 w-4 shrink-0 text-primary' />
                    {[item.show.city, item.show.theater, item.show.screen].filter(Boolean).join(" · ")}
                  </p>
                </div>

                <div className='mt-5 grid gap-3 sm:grid-cols-3'>
                  <div className='rounded-md border border-white/10 bg-white/[0.04] p-3'>
                    <p className='flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-gray-500'>
                      <Armchair className='h-4 w-4 text-primary' />
                      Seats
                    </p>
                    <p className='mt-2 text-sm font-semibold text-white'>{item.bookedSeats.join(", ")}</p>
                  </div>
                  <div className='rounded-md border border-white/10 bg-white/[0.04] p-3'>
                    <p className='text-xs uppercase tracking-[0.14em] text-gray-500'>Tickets</p>
                    <p className='mt-2 text-sm font-semibold text-white'>{item.bookedSeats.length}</p>
                  </div>
                  <div className='rounded-md border border-white/10 bg-white/[0.04] p-3'>
                    <p className='text-xs uppercase tracking-[0.14em] text-gray-500'>Seat Type</p>
                    <p className='mt-2 line-clamp-1 text-sm font-semibold text-white'>
                      {item.bookedSeatDetails?.length
                        ? item.bookedSeatDetails.map((seat) => `${seat.seat} ${seat.category}`).join(", ")
                        : "Standard"}
                    </p>
                  </div>
                </div>

                {item.foodItems?.length > 0 && (
                  <div className='mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300'>
                    <p className='mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-gray-500'>
                      <Utensils className='h-4 w-4 text-primary' />
                      Food & Drinks
                    </p>
                    {item.foodItems.map((food) => `${food.name} x${food.quantity}`).join(", ")}
                  </div>
                )}

                {item.cancellationAdminNote && (
                  <p className='mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-300'>
                    <span className='text-gray-500'>Admin Note:</span> {item.cancellationAdminNote}
                  </p>
                )}
              </div>

              <aside className='rounded-md border border-white/10 bg-black/20 p-4 lg:text-right'>
                <p className='text-xs uppercase tracking-[0.18em] text-gray-500'>Total Amount</p>
                <p className='mt-1 text-3xl font-bold'>{currency}{item.amount}</p>

                <div className='mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-gray-400'>
                  <div className='flex justify-between gap-4 lg:justify-end'>
                    <span>Seats</span>
                    <span className='text-gray-200'>{currency}{item.seatsAmount || item.amount}</span>
                  </div>
                  {item.foodAmount > 0 && (
                    <div className='flex justify-between gap-4 lg:justify-end'>
                      <span>Food</span>
                      <span className='text-gray-200'>{currency}{item.foodAmount}</span>
                    </div>
                  )}
                  {item.discountAmount > 0 && (
                    <div className='flex justify-between gap-4 text-emerald-300 lg:justify-end'>
                      <span>Saved</span>
                      <span>-{currency}{item.discountAmount}</span>
                    </div>
                  )}
                </div>

                <div className='mt-5 flex flex-col gap-3'>
                  {canPayNow(item) && (
                    <a href={item.paymentLink} className='inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold transition hover:bg-primary-dull'>
                      <ReceiptText className='h-4 w-4' />
                      Pay Now
                    </a>
                  )}
                  {canDownloadTicket(item) && (
                    <button
                      onClick={() => downloadTicketPdf(item)}
                      disabled={downloadingId === item._id}
                      className='inline-flex items-center justify-center gap-2 rounded-md border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60'
                    >
                      <Download className='w-4 h-4' />
                      {downloadingId === item._id ? "Generating..." : "Download PDF Ticket"}
                    </button>
                  )}
                  {canRequestCancellation(item) && (
                    <button
                      onClick={() => requestCancellation(item._id)}
                      disabled={requestingId === item._id}
                      className='rounded-md border border-white/15 px-5 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:opacity-60'
                    >
                      {requestingId === item._id ? "Requesting..." : "Cancel Booking"}
                    </button>
                  )}
                </div>
              </aside>
            </div>
          </div>
        ))
      )}
      </div>
    </main>
  )
}

export default MyBookings
