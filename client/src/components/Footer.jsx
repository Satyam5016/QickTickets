import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="px-6 md:px-16 lg:px-36 pt-20 w-full text-gray-300">
      <div className="mx-auto max-w-7xl rounded-lg border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <img alt="QuickTickets" className="h-12 w-auto" src={assets.logo} />
            <p className="mt-5 max-w-md text-sm leading-6 text-gray-400">
              QuickTickets helps moviegoers discover shows, choose seats, add snacks, pay securely, and carry QR tickets in one polished place.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <img src={assets.googlePlay} alt="google play" className="h-9 w-auto opacity-90" />
              <img src={assets.appStore} alt="app store" className="h-9 w-auto opacity-90" />
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-white mb-4">Explore</h2>
            <ul className="text-sm space-y-3 text-gray-400">
              <li><Link className="hover:text-white" to="/">Home</Link></li>
              <li><Link className="hover:text-white" to="/movies">Movies</Link></li>
              <li><Link className="hover:text-white" to="/my-bookings">My Bookings</Link></li>
              <li><Link className="hover:text-white" to="/privacy-policy">Privacy policy</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-white mb-4">Support</h2>
            <div className="text-sm space-y-3 text-gray-400">
              <p>+91-7208431143</p>
              <p>satyamyadav4848@gmail.com</p>
              <Link className="block hover:text-white" to="/contact">Contact us</Link>
            </div>
          </div>
        </div>
        <p className="pt-5 text-center text-sm text-gray-500">
          Copyright {new Date().getFullYear()} © QuickTickets. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
