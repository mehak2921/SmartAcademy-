import React from 'react'
import { FileText } from 'lucide-react'

export default function InlineSummary({ summaryData }) {
  if (!summaryData || !summaryData.summary) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden my-4 max-w-2xl">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <FileText size={20} />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-white">
          {summaryData.title || "Summary"}
        </h3>
      </div>
      <div className="p-6">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {summaryData.summary}
        </p>
      </div>
    </div>
  )
}
