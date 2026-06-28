import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'

const AdminNavbar = () => {
  return (
    <div className='glass-panel flex h-16 items-center justify-between rounded-none border-x-0 border-t-0 px-6 md:px-10'>
      <Link to="/">
        <img src={assets.logo} alt="QuickTickets" className="h-11 w-auto"/>
      </Link>
      <p className='text-sm font-semibold text-gray-300'>Admin Console</p>
    </div>
  )
}

export default AdminNavbar
