import React from 'react'
import { ExternalLink, BookOpen } from 'lucide-react'

export default function InlineResources({ resourcesData }) {
  if (!resourcesData || !resourcesData.resources || resourcesData.resources.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden my-4 max-w-2xl">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
          <BookOpen size={20} />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-white">
          {resourcesData.title || "Learning Resources"}
        </h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {resourcesData.resources.map((res, i) => (
            <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="flex flex-col p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">{res.title}</h4>
                <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-500" />
              </div>
              <span className="inline-block mt-2 text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md self-start">
                {res.type}
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{res.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
