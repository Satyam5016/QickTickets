import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { ClockIcon, ArrowRightIcon, Minus, Plus, ShoppingBag, BadgePercent, X } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat'
import BlurCircle from '../components/BlurCircle'
import toast from 'react-hot-toast'
import Loading from '../components/Loading'
import { useAppContext } from '../context/AppContext'

const SeatLayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]
  const seatCategories = ["Regular", "Premium", "Recliner", "VIP"]
  const categoryStyles = {
    Regular: "border-sky-400/70 text-sky-100 hover:bg-sky-400/20",
    Premium: "border-emerald-400/70 text-emerald-100 hover:bg-emerald-400/20",
    Recliner: "border-amber-400/70 text-amber-100 hover:bg-amber-400/20",
    VIP: "border-fuchsia-400/70 text-fuchsia-100 hover:bg-fuchsia-400/20",
  }
  const foodMenu = [
    { id: "classic-popcorn", name: "Classic Popcorn", price: 8 },
    { id: "cheese-popcorn", name: "Cheese Popcorn", price: 10 },
    { id: "soft-drink", name: "Soft Drink", price: 5 },
    { id: "nachos", name: "Nachos", price: 7 },
    { id: "combo-for-two", name: "Combo for Two", price: 18 },
    { id: "family-combo", name: "Family Combo", price: 28 },
  ]

  const [show, setShow] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [selectedFood, setSelectedFood] = useState({})
  const [promoCode, setPromoCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const { id, date } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const currency = import.meta.env.VITE_CURRENCY || "$"
  const selectedCity = searchParams.get("city") || ""
  const selectedTheater = searchParams.get("theater") || ""
  const selectedScreen = searchParams.get("screen") || ""

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
    clearCoupon()
  }

  const getSeatCategory = (seatId) => {
    const row = seatId?.[0]
    if (["A", "B"].includes(row)) return "Regular"
    if (["C", "D"].includes(row)) return "Premium"
    if (["E", "F", "G", "H"].includes(row)) return "Recliner"
    return "VIP"
  }

  const getCategoryPrices = () => ({
    Regular: Number(selectedTime?.seatCategoryPrices?.Regular || selectedTime?.showPrice || 0),
    Premium: Number(selectedTime?.seatCategoryPrices?.Premium || selectedTime?.showPrice || 0),
    Recliner: Number(selectedTime?.seatCategoryPrices?.Recliner || selectedTime?.showPrice || 0),
    VIP: Number(selectedTime?.seatCategoryPrices?.VIP || selectedTime?.showPrice || 0),
  })

  const getSelectedTotal = () => {
    const prices = getCategoryPrices()
    return selectedSeats.reduce((total, seat) => total + prices[getSeatCategory(seat)], 0)
  }

  const updateFoodQuantity = (foodId, change) => {
    setSelectedFood((prev) => {
      const nextQuantity = Math.min(10, Math.max(0, (prev[foodId] || 0) + change))
      const next = { ...prev }

      if (nextQuantity === 0) {
        delete next[foodId]
      } else {
        next[foodId] = nextQuantity
      }

      return next
    })
    clearCoupon()
  }

  const getSelectedFoodItems = () => (
    foodMenu
      .filter((item) => selectedFood[item.id])
      .map((item) => ({ ...item, quantity: selectedFood[item.id] }))
  )

  const getFoodTotal = () => (
    getSelectedFoodItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  )

  const getCheckoutSubtotal = () => getSelectedTotal() + getFoodTotal()
  const getCheckoutTotal = () => Math.max(0, getCheckoutSubtotal() - discountAmount)

  const clearCoupon = () => {
    setAppliedCoupon(null)
    setDiscountAmount(0)
  }

  const applyCoupon = async () => {
    if (!user) return toast.error('Please login to apply a promo code')
    if (!selectedTime || !selectedSeats.length) return toast.error('Please select a time and seats first')
    if (!promoCode.trim()) return toast.error('Enter a promo code')

    try {
      setApplyingCoupon(true)
      const { data } = await axiosInstance.post(
        '/bookings/coupon/validate',
        {
          showId: selectedTime.showId,
          selectedSeats,
          selectedFoodItems: getSelectedFoodItems().map(({ id, quantity }) => ({ id, quantity })),
          promoCode,
        },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )

      if (data.success) {
        setAppliedCoupon(data.coupon)
        setDiscountAmount(data.discountAmount)
        setPromoCode(data.coupon.code)
        toast.success(data.message)
      } else {
        clearCoupon()
        toast.error(data.message)
      }
    } catch (error) {
      console.error("Error applying promo code:", error)
      toast.error("Unable to apply promo code")
    } finally {
      setApplyingCoupon(false)
    }
  }

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      {Array.from({ length: count }, (_, i) => {
        const seatId = `${row}${i + 1}`
        const isSelected = selectedSeats.includes(seatId)
        const category = getSeatCategory(seatId)

        return (
          <button
            key={seatId}
            onClick={() => handleSeatClick(seatId)}
            disabled={occupiedSeats.includes(seatId)}
            title={`${category} - ${currency}${getCategoryPrices()[category]}`}
            className={`h-8 w-8 rounded border cursor-pointer transition text-[10px]
              ${isSelected ? "bg-primary text-white" : "hover:bg-primary/20"} 
              ${!isSelected ? categoryStyles[category] : "border-primary"}
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
        {
          showId: selectedTime.showId,
          selectedSeats,
          selectedFoodItems: getSelectedFoodItems().map(({ id, quantity }) => ({ id, quantity })),
          promoCode: appliedCoupon?.code || "",
        },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )

      if (data.success) {
        window.location.href=data.url;
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

  const availableTimes = (show.dateTime?.[date] || []).filter((item) =>
    (!selectedCity || (item.city || "Mumbai") === selectedCity)
    && (!selectedTheater || (item.theater || "QuickTickets Cinema") === selectedTheater)
    && (!selectedScreen || (item.screen || "Screen 1") === selectedScreen)
  )

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-8 md:pt-12 min-h-screen">
      {/* Available Timings */}
      <div className="flex items-start md:items-center">
        <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max">
          <p className="text-lg font-semibold px-6">Available Timings</p>
          {(selectedCity || selectedTheater || selectedScreen) && (
            <div className="px-6 mt-3 text-xs text-gray-400">
              <p>{selectedCity}</p>
              <p>{selectedTheater}</p>
              <p>{selectedScreen}</p>
            </div>
          )}
          <div className="mt-5 space-y-1">
            {availableTimes.length > 0 ? availableTimes.map((item) => (
              <div
                key={item.time}
                onClick={() => {
                  setSelectedTime(item)
                  setSelectedSeats([])
                  clearCoupon()
                }}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition 
                  ${selectedTime?.time === item.time
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20"}`}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{isoTimeFormat(item.time)}</p>
              </div>
            )) : (
              <p className="px-6 text-sm text-gray-500">No shows for this theater.</p>
            )}
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

        {selectedTime && (
          <div className="flex flex-wrap justify-center gap-3 mb-6 text-xs">
            {seatCategories.map((category) => (
              <div key={category} className="flex items-center gap-2 rounded border border-primary/20 bg-primary/5 px-3 py-2">
                <span className={`h-3 w-3 rounded-sm border ${categoryStyles[category].split(" ").slice(0, 2).join(" ")}`} />
                <span className="text-gray-300">{category}</span>
                <span className="text-white">{currency}{getCategoryPrices()[category]}</span>
              </div>
            ))}
          </div>
        )}

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

        {selectedSeats.length > 0 && (
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-400">Selected Seats: {selectedSeats.join(", ")}</p>
            <p className="text-xl font-semibold mt-1">Seats Total: {currency}{getSelectedTotal()}</p>
          </div>
        )}

        <div className="w-full max-w-3xl mt-10">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Food & Beverages</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {foodMenu.map((item) => (
              <div key={item.id} className="border border-primary/20 bg-primary/5 rounded-md p-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-sm text-gray-300">{currency}{item.price}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => updateFoodQuantity(item.id, -1)}
                    disabled={!selectedFood[item.id]}
                    className="h-8 w-8 flex items-center justify-center border border-primary/40 rounded disabled:opacity-40"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">{selectedFood[item.id] || 0}</span>
                  <button
                    onClick={() => updateFoodQuantity(item.id, 1)}
                    disabled={(selectedFood[item.id] || 0) >= 10}
                    className="h-8 w-8 flex items-center justify-center bg-primary rounded"
                    aria-label={`Add ${item.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(selectedSeats.length > 0 || getFoodTotal() > 0) && (
          <div className="mt-8 w-full max-w-md border border-primary/20 bg-primary/10 rounded-md p-4 text-sm">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BadgePercent className="w-4 h-4 text-primary" />
                <span className="font-medium">Promo Code</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase())
                    clearCoupon()
                  }}
                  placeholder="FIRST50, WEEKEND20, STUDENT15"
                  className="min-w-0 flex-1 bg-transparent border border-gray-700 rounded-md px-3 py-2 outline-none"
                />
                {appliedCoupon ? (
                  <button
                    onClick={() => {
                      setPromoCode("")
                      clearCoupon()
                    }}
                    className="h-10 w-10 flex items-center justify-center border border-primary/40 rounded-md"
                    aria-label="Remove promo code"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={applyCoupon}
                    disabled={applyingCoupon}
                    className="px-4 py-2 bg-primary rounded-md font-medium disabled:opacity-60"
                  >
                    {applyingCoupon ? "..." : "Apply"}
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <p className="text-xs text-green-400 mt-2">{appliedCoupon.label} applied</p>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Seats</span>
              <span>{currency}{getSelectedTotal()}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-400">Food & Beverages</span>
              <span>{currency}{getFoodTotal()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between mt-2 text-green-400">
                <span>Discount</span>
                <span>-{currency}{discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between mt-3 pt-3 border-t border-primary/20 text-lg font-semibold">
              <span>Total</span>
              <span>{currency}{getCheckoutTotal()}</span>
            </div>
          </div>
        )}

        {/* Proceed Button */}
        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-8 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default SeatLayout
