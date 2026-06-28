import React, { useState } from 'react'
import BlurCircle from './BlurCircle'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const DateSelect = ({ dateTime, id }) => {

    const navigate = useNavigate();

    const [selected, setSelected] = useState(null)
    const [selectedCity, setSelectedCity] = useState("")
    const [selectedTheater, setSelectedTheater] = useState("")
    const [selectedScreen, setSelectedScreen] = useState("")

    const allShows = Object.values(dateTime || {}).flat()
    const cities = [...new Set(allShows.map((show) => show.city || "Mumbai"))]
    const theaters = [...new Set(allShows
        .filter((show) => !selectedCity || (show.city || "Mumbai") === selectedCity)
        .map((show) => show.theater || "QuickTickets Cinema"))]
    const screens = [...new Set(allShows
        .filter((show) => (!selectedCity || (show.city || "Mumbai") === selectedCity)
            && (!selectedTheater || (show.theater || "QuickTickets Cinema") === selectedTheater))
        .map((show) => show.screen || "Screen 1"))]
    const availableDates = Object.entries(dateTime || {})
        .filter(([, shows]) => shows.some((show) =>
            (!selectedCity || (show.city || "Mumbai") === selectedCity)
            && (!selectedTheater || (show.theater || "QuickTickets Cinema") === selectedTheater)
            && (!selectedScreen || (show.screen || "Screen 1") === selectedScreen)
        ))
        .map(([date]) => date)

    const onBookHandler = () => {
        if (!selectedCity) {
            return toast('Please select a city')
        }
        if (!selectedTheater) {
            return toast('Please select a theater')
        }
        if (!selectedScreen) {
            return toast('Please select a screen')
        }
        if (!selected) {
            return toast('Please select a date')
        }
        const params = new URLSearchParams({
            city: selectedCity,
            theater: selectedTheater,
            screen: selectedScreen,
        })
        navigate(`/movies/${id}/${selected}?${params.toString()}`)
        scrollTo(0, 0)
    }

    return (
        <div id={id || 'dateSelect'} className="pt-30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
                <BlurCircle top="-100px" left="-100px" />
                <BlurCircle top="100px" left="-100px" />

                {/* Left Section */}
                <div className="w-full">
                    <p className="text-lg font-semibold">Choose Theater</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 max-w-3xl">
                        <select
                            value={selectedCity}
                            onChange={(e) => {
                                setSelectedCity(e.target.value)
                                setSelectedTheater("")
                                setSelectedScreen("")
                                setSelected(null)
                            }}
                            className="bg-gray-900 border border-primary/30 rounded-md px-3 py-2 outline-none"
                        >
                            <option value="">Select city</option>
                            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                        </select>
                        <select
                            value={selectedTheater}
                            onChange={(e) => {
                                setSelectedTheater(e.target.value)
                                setSelectedScreen("")
                                setSelected(null)
                            }}
                            disabled={!selectedCity}
                            className="bg-gray-900 border border-primary/30 rounded-md px-3 py-2 outline-none disabled:opacity-50"
                        >
                            <option value="">Select theater</option>
                            {theaters.map((theater) => <option key={theater} value={theater}>{theater}</option>)}
                        </select>
                        <select
                            value={selectedScreen}
                            onChange={(e) => {
                                setSelectedScreen(e.target.value)
                                setSelected(null)
                            }}
                            disabled={!selectedTheater}
                            className="bg-gray-900 border border-primary/30 rounded-md px-3 py-2 outline-none disabled:opacity-50"
                        >
                            <option value="">Select screen</option>
                            {screens.map((screen) => <option key={screen} value={screen}>{screen}</option>)}
                        </select>
                    </div>

                    <p className="text-lg font-semibold mt-8">Choose Date</p>
                    <div className="flex items-center gap-6 text-sm mt-5">
                        <ChevronLeftIcon width={28} />
                        <span className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
                            {availableDates.map((date) => (
                                <button
                                    key={date}
                                    className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer ${selected === date ? 'bg-primary text-white' :"border border-primary/70 "}`}
                                    onClick={() => setSelected(date)}
                                >
                                    <span>{new Date(date).getDate()}</span>
                                    <span>
                                        {new Date(date).toLocaleDateString("en-US", { month: "short" })}
                                    </span>
                                </button>
                            ))}
                        </span>
                        <ChevronRightIcon width={28} />
                    </div>
                </div>

                {/* Book Now Button */}
                <button onClick={onBookHandler} className="bg-primary text-white px-8 py-2 rounded hover:bg-primary/90 transition-all cursor-pointer">
                    Book Now
                </button>
            </div>
        </div>
    )
}

export default DateSelect
