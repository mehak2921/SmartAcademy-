import React from 'react'
import { Calendar } from 'lucide-react'

export default function InlineStudyPlan({ planData }) {
  if (!planData || !planData.tasks || planData.tasks.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden my-4 max-w-2xl">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
          <Calendar size={20} />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-white">
          {planData.title || "Study Plan"}
        </h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {planData.tasks.map((task, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
              <div className="flex-shrink-0 w-16 text-center">
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Day</span>
                <span className="block text-xl font-bold text-slate-700 dark:text-slate-200">{task.day}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">{task.topic}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
