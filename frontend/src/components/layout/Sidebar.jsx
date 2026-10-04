import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { SquarePen, Home, LayoutDashboard, Search, MessageSquare, BarChart, Trash2, ChevronRight, X, PanelLeftClose } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import axios from 'axios'
import ProfileDropdown from '../ui/ProfileDropdown'

export default function Sidebar({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [recentChats, setRecentChats] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [recentsOpen, setRecentsOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchSessions = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/chat/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecentChats(res.data || [])
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => { fetchSessions() }, [location.pathname])
  useEffect(() => {
    const handler = () => fetchSessions()
    window.addEventListener('chat-session-updated', handler)
    return () => window.removeEventListener('chat-session-updated', handler)
  }, [])

  const handleNewChat = () => {
    navigate('/dashboard/chat?new=' + Date.now())
    if (onClose) onClose()
  }

  const handleDeleteSession = async (e, sessionId) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecentChats(prev => prev.filter(c => c.id !== sessionId))
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const navItemClass = (isActive) =>
    `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
      isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
    }`

  return (
    <div className="w-60 h-full bg-[#0F172A] text-gray-300 flex flex-col">

      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <span className="text-lg font-bold text-blue-400 tracking-tight">Smart Academy</span>
        <button className="md:hidden p-1.5 text-gray-500 hover:text-white border border-gray-700 rounded-md transition-colors" onClick={onClose} title="Collapse sidebar">
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="px-3 mt-4 space-y-1">
        <button onClick={handleNewChat} className={navItemClass(false) + ' w-full'}>
          <SquarePen size={18} />
          <span>New chat</span>
        </button>

        <NavLink onClick={onClose} to="/" end className={({ isActive }) => navItemClass(isActive)}>
          <Home size={18} />
          <span>Home</span>
        </NavLink>

        <NavLink onClick={onClose} to="/dashboard/analytics" className={({ isActive }) => navItemClass(isActive)}>
          <BarChart size={18} />
          <span>Analytics</span>
        </NavLink>

        <button
          onClick={() => { setSearchOpen(!searchOpen); setRecentsOpen(true) }}
          className={navItemClass(searchOpen) + ' w-full'}
        >
          <Search size={18} />
          <span>Search</span>
        </button>
      </nav>

      {/* Search Input (inline, expands when Search is clicked) */}
      {searchOpen && (
        <div className="px-4 mt-2">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Recents */}
      <div className="px-3 mt-6">
        <button
          onClick={() => setRecentsOpen(!recentsOpen)}
          className="flex items-center space-x-1 text-xs font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors"
        >
          <span>Recents</span>
          <ChevronRight size={14} className={`transform transition-transform ${recentsOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Recent Chats List (expandable) */}
      {recentsOpen && (
        <div className="flex-1 overflow-y-auto px-3 mt-2 space-y-0.5">
          {loadingSessions ? (
            <div className="px-3 py-2 text-xs text-gray-600">Loading…</div>
          ) : (() => {
            const filtered = searchQuery
              ? recentChats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
              : recentChats
            return filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-600">
                {searchQuery ? 'No matching chats' : 'No chats yet'}
              </div>
            ) : (
              filtered.map(chat => (
              <NavLink onClick={onClose}
                key={chat.id}
                to={`/dashboard/chat?session=${chat.id}`}
                className={({ isActive }) => {
                  const isCurrent = location.search.includes(chat.id)
                  return `group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm ${
                    isCurrent ? 'text-white bg-white/5' : 'text-gray-400 hover:text-gray-200'
                  }`
                }}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <MessageSquare size={14} className="flex-shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all flex-shrink-0"
                  title="Delete chat"
                >
                  <Trash2 size={12} />
                </button>
              </NavLink>
            ))
            )
          })()}
        </div>
      )}

      {/* If recents is closed, take up remaining space */}
      {!recentsOpen && <div className="flex-1" />}

      {/* Bottom: User */}
      <div className="px-4 py-4 border-t border-gray-800/50">
        <div className="flex items-center space-x-3">
          <ProfileDropdown position="top" />
          <span className="text-sm text-gray-400 truncate">
            {user?.email || 'User'}
          </span>
        </div>
      </div>
    </div>
  )
}
