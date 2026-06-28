import React, { useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { Heart, MenuIcon, SearchIcon, TicketPlus, XIcon } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { useAppContext } from '../context/AppContext'

const Navbar = () => {

  const [isOpen, setIsOpen] = useState(false)
  const { user } = useUser()
  const { openSignIn } = useClerk()
  const navigate = useNavigate()
  const { favoriteMovies } = useAppContext()

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Movies", to: "/movies" },
    { label: "My Bookings", to: "/my-bookings" },
    ...(favoriteMovies.length > 0 ? [{ label: "Favorites", to: "/favorite" }] : []),
  ]

  return (
    <header className='fixed top-0 left-0 z-50 w-full px-4 md:px-8 lg:px-14 py-4'>
      <div className='glass-panel mx-auto flex max-w-7xl items-center justify-between rounded-lg px-4 py-3'>
      <Link to='/' className='flex items-center'>
        <img src={assets.logo} alt="QuickTickets" className='h-10 md:h-12 w-auto object-contain' />

      </Link>

      <nav className={`max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:bg-[#0b0d13]/95 max-md:backdrop-blur-xl max-md:border-r max-md:border-white/10 max-md:text-lg z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-7 md:gap-6 lg:gap-8 max-md:h-screen overflow-hidden transition-[width] duration-300 ${isOpen ? 'max-md:w-full' : 'max-md:w-0'} md:w-auto`}>
        <XIcon className='md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer' onClick={() => setIsOpen(!isOpen)} />

        {navLinks.map((link) => (
          <Link
            key={link.to}
            onClick={() => { scrollTo(0, 0); setIsOpen(false) }}
            to={link.to}
            className='text-sm font-medium text-gray-300 hover:text-white transition'
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className='flex items-center gap-3 md:gap-5'>
        {favoriteMovies.length > 0 && (
          <button onClick={() => navigate('/favorite')} className='max-md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition' title='Favorites'>
            <Heart className='w-5 h-5 text-primary' />
          </button>
        )}
        <button onClick={() => navigate('/movies')} className='max-md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition' title='Search movies'>
          <SearchIcon className='w-5 h-5' />
        </button>
        {
          !user ? (
            <button onClick={openSignIn} className='px-4 py-2 sm:px-6 bg-primary hover:bg-primary-dull transition rounded-md text-sm font-semibold cursor-pointer' >Login</button>
          ) : (
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action label='My Bookings' labelIcon={<TicketPlus width={15} />} onClick={() => navigate('/my-bookings')} />
              </UserButton.MenuItems>
            </UserButton>
          )
        }
      </div>
      <MenuIcon className='max-md:ml-4 md:hidden w-8 h-8 text-white cursor-pointer' onClick={() => { setIsOpen(!isOpen) }} />
      </div>
    </header>
  )
}

export default Navbar
