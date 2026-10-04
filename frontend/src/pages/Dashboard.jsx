import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0B1120] relative">
      {/* Mobile sidebar toggle button */}
      <button 
        className={`md:hidden fixed top-4 left-4 z-50 p-2 ${sidebarOpen ? "hidden" : ""} bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-md shadow-md text-gray-700 dark:text-gray-200`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {!sidebarOpen && <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar wrapper */}
      <div className={`fixed inset-y-0 left-0 z-40 h-screen transform transition-transform duration-300 md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col p-4 lg:p-8 pt-20 md:pt-4 overflow-x-hidden">
        <Outlet key={location.pathname + location.search} />
      </div>
    </div>
  )
}


