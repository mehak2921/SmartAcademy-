import React, { useState, useEffect } from 'react'
import { BarChart, Book, Target, Award, Clock, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { supabase } from '../services/supabase'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        
        const response = await axios.get('${import.meta.env.VITE_API_URL}/api/analytics/', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setData(response.data)
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    )
  }

  const stats = [
    { label: 'Documents Uploaded', value: data?.documents_uploaded || 0, icon: Book, color: 'text-blue-500' },
    { label: 'Quizzes Taken', value: data?.quizzes_taken || 0, icon: Target, color: 'text-purple-500' },
    { label: 'Average Score', value: data?.average_score || '0%', icon: Award, color: 'text-green-500' },
    { label: 'Study Time', value: data?.study_time || '0m', icon: Clock, color: 'text-orange-500' },
  ]

  const weakTopics = data?.weak_topics || []
  
  let learningStreak = [false, false, false, false, false, false, false]
  if (data?.active_timestamps) {
    const today = new Date()
    // Find Monday of the current week locally
    const dayOfWeek = today.getDay()
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysSinceMonday)
    monday.setHours(0, 0, 0, 0)
    
    // Convert active timestamps to local date strings (YYYY-MM-DD)
    const activeLocalDates = new Set(
      data.active_timestamps
        .map(ts => {
          const d = new Date(ts)
          // Ensure valid date
          if (isNaN(d.getTime())) return null
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
        .filter(Boolean)
    )

    // Calculate streak for Mon-Sun
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(monday)
      currentDay.setDate(monday.getDate() + i)
      const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`
      learningStreak[i] = activeLocalDates.has(dateStr)
    }
  } else if (data?.learning_streak) {
    // Fallback if backend returns old format
    learningStreak = data.learning_streak
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart size={32} className="text-indigo-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 bg-gray-50 dark:bg-gray-900 rounded-lg ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Learning Streak</h3>
           <div className="flex space-x-2">
             {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
               <div key={i} className="flex flex-col items-center flex-1">
                 <div className={`w-full h-12 rounded-t-md ${learningStreak[i] ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                 <span className="text-xs text-gray-500 mt-2">{day}</span>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Weak Topics</h3>
           {weakTopics.length > 0 ? (
             <ul className="space-y-3">
               {weakTopics.map((topic, idx) => (
                 <li key={idx} className="flex justify-between items-center text-sm">
                   <span className="text-gray-700 dark:text-gray-300">{topic.title}</span>
                   <span className="text-red-500 font-medium">{topic.score}</span>
                 </li>
               ))}
             </ul>
           ) : (
             <p className="text-sm text-gray-500 dark:text-gray-400">You don't have any weak topics yet! Keep up the good work.</p>
           )}
        </div>
      </div>
    </div>
  )
}
