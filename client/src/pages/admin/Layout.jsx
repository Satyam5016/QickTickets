import React, { useEffect } from 'react'
import AdminNavbar from '../../components/admin/AdminNavbar'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import Loading from '../../components/Loading'


const Layout = () => {
  const {isAdmin,fetchIsAdmin} = useAppContext();
  useEffect(()=>{
    fetchIsAdmin();
  }, [])

  return isAdmin ? (
    <>
      <AdminNavbar/>
      <div className="flex">
        <AdminSidebar/>
        <div className="h-[calc(100vh-64px)] flex-1 overflow-y-auto px-4 py-8 md:px-10">
            <Outlet/>
        </div>
      </div>
    </>
  ):<Loading/>
}

export default Layout
