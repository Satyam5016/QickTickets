import { LayoutDashboardIcon, ListCollapseIcon, ListIcon, PlusSquareIcon } from 'lucide-react'
import React from 'react'
import { assets } from '../../assets/assets'
import { NavLink } from 'react-router-dom'
const AdminSidebar = () => {
    const user = {
        firstName: 'Admin',
        lastName: 'User',
        imageUrl: assets.profile,
    }

    const adminNavlinks = [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboardIcon },
        { name: 'Add Shows', path: '/admin/add-shows', icon: PlusSquareIcon },
        { name: 'List Shows', path: '/admin/list-shows', icon: ListIcon },
        { name: 'List Bookings', path: '/admin/list-bookings', icon: ListCollapseIcon },
    ]
    return (
        <aside className='flex h-[calc(100vh-64px)] w-16 flex-col items-center border-r border-white/10 bg-white/[0.03] pt-8 text-sm md:w-64'>
            <img className='h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto' src={user.imageUrl} alt="sidebar" />
            <p className='mt-2 text-base max-md:hidden'>{user.firstName} {user.lastName}</p>
            <div className='mt-5 w-full px-3'>
                {adminNavlinks.map((link, index) => (
                    <NavLink key={index} to={link.path} end className={({ isActive }) => `relative mb-1 flex w-full items-center gap-3 rounded-md px-4 py-3 text-gray-400 transition hover:bg-white/5 hover:text-white ${isActive && 'bg-primary/15 text-primary'}`}>
                        {({ isActive }) => (
                            <>
                                <link.icon className="w-5 h-5" />
                                <p className="max-md:hidden">{link.name}</p>
                                {isActive && <span className='absolute right-2 h-6 w-1 rounded bg-primary' />}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </aside>
    )
}

export default AdminSidebar
