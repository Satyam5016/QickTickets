import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { ClockIcon, ArrowRightIcon } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat'
import BlurCircle from '../components/BlurCircle'
import toast from 'react-hot-toast'
import Loading from '../components/Loading'
import { useAppContext } from '../context/AppContext'

const SeatLayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]

  const [show, setShow] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [occupiedSeats, setOccupiedSeats] = useState([])

  const { id, date } = useParams()
  const navigate = useNavigate()

  // ✅ use axiosInstance from context
  const { axiosInstance, getToken, user } = useAppContext()

  const getShow = async () => {
    try {
      const { data } = await axiosInstance.get(`/show/all/${id}`)
      if (data.success) {
        setShow(data)
      } else {
        toast.error(data.message || "Failed to fetch show details")
      }
    } catch (error) {
      console.error("Error fetching show:", error)
      toast.error("Error fetching show")
    }
  }

  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast.error("Please select time first")
    }

    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) {
      return toast.error("You can only select up to 5 seats")
    }
    if (occupiedSeats.includes(seatId)) {
      return toast('This seat is already booked')
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    )
  }

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      {Array.from({ length: count }, (_, i) => {
        const seatId = `${row}${i + 1}`
        const isSelected = selectedSeats.includes(seatId)

        return (
          <button
            key={seatId}
            onClick={() => handleSeatClick(seatId)}
            disabled={occupiedSeats.includes(seatId)}
            className={`h-8 w-8 rounded border border-primary/60 cursor-pointer transition 
              ${isSelected ? "bg-primary text-white" : "hover:bg-primary/20"} 
              ${occupiedSeats.includes(seatId) && "opacity-50 cursor-not-allowed"}`}
          >
            {seatId}
          </button>
        )
      })}
    </div>
  )

  const getOccupiedSeats = async () => {
    if (!selectedTime) return
    try {
      const { data } = await axiosInstance.get(`/bookings/seats/${selectedTime.showId}`) // ✅ plural
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error("Error fetching seats:", error)
      toast.error("Error fetching occupied seats")
    }
  }


  const bookTickets = async () => {
    try {
      if (!user) return toast.error('Please login to proceed')

      if (!selectedTime || !selectedSeats.length) {
        return toast.error('Please select a time and seats')
      }

      const { data } = await axiosInstance.post(
        '/bookings/create',
        { showId: selectedTime.showId, selectedSeats },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )

      if (data.success) {
        window.location.href=data.paymentLink;
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error("Error booking tickets:", error)
      toast.error("Booking failed")
    }
  }

  useEffect(() => {
    getShow()
  }, [id])

  useEffect(() => {
    if (selectedTime) {
      getOccupiedSeats()
    }
  }, [selectedTime])

  if (!show) {
    return <Loading />
  }

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-8 md:pt-12 min-h-screen">
      {/* Available Timings */}
      <div className="flex items-start md:items-center">
        <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max">
          <p className="text-lg font-semibold px-6">Available Timings</p>
          <div className="mt-5 space-y-1">
            {show.dateTime?.[date]?.map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition 
                  ${selectedTime?.time === item.time
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20"}`}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{isoTimeFormat(item.time)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seats Layout */}
      <div className="relative flex-1 flex flex-col items-center mt-40 md:mt-48">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>
        <img src={assets.screenImage} alt="screen" className="mb-2" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        {/* First group (A & B) */}
        <div className="flex flex-col items-center mb-6 text-xs text-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>
        </div>

        {/* Remaining groups */}
        <div className="grid grid-cols-2 gap-11">
          {groupRows.slice(1).map((group, idx) => (
            <div key={idx}>
              {group.map((row) => renderSeats(row))}
            </div>
          ))}
        </div>

        {/* Proceed Button */}
        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-16 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default SeatLayout
