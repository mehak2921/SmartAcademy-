import React from 'react'
import { Lightbulb } from 'lucide-react'

export default function InlineConcepts({ conceptsData }) {
  if (!conceptsData || !conceptsData.concepts || conceptsData.concepts.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden my-4 max-w-2xl">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
          <Lightbulb size={20} />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-white">
          {conceptsData.title || "Key Concepts"}
        </h3>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {conceptsData.concepts.map((concept, i) => (
            <div key={i} className="pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">{concept.name}</h4>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 leading-relaxed">{concept.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
