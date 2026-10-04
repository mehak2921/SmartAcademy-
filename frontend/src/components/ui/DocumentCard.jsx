import React from 'react'
import { FileText, Copy, Volume2, Download } from 'lucide-react'

// document prop = { id, name, file }
export default function DocumentCard({ document, onAction, isProcessing = false }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden w-full max-w-2xl shadow-sm">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-blue-500 uppercase">
            <span>DOCUMENT | NATURAL_FLOW</span>
          </div>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Copy size={14} /> <span>Copy</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Volume2 size={14} /> <span>Audio</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Download size={14} /> <span>PDF</span>
            </button>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase">
          {document.name}
        </h3>
        
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
              Document uploaded and is being processed...
            </>
          ) : (
            "Document uploaded and ready for analysis."
          )}
        </p>
      </div>

      <div className={`bg-gray-50 dark:bg-[#0F172A] border-t border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-2 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
        <button 
          onClick={() => onAction('summary', document)}
          className="px-4 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E293B] hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-colors"
        >
          Summary
        </button>
        <button 
          onClick={() => onAction('quiz', document)}
          className="px-4 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E293B] hover:border-purple-400 text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors"
        >
          Quiz
        </button>
        <button 
          onClick={() => onAction('flashcards', document)}
          className="px-4 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E293B] hover:border-green-400 text-gray-700 dark:text-gray-300 hover:text-green-500 transition-colors"
        >
          Flashcards
        </button>
        <button 
          onClick={() => onAction('plan', document)}
          className="px-4 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E293B] hover:border-orange-400 text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors"
        >
          Study Plan
        </button>
      </div>
    </div>
  )
}
