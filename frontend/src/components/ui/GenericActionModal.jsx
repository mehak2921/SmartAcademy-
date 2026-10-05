import React, { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

export default function GenericActionModal({ isOpen, onClose, onGenerate, sourceName, actionType }) {
  const [instructions, setInstructions] = useState('')

  if (!isOpen) return null

  const handleGenerate = () => {
    onGenerate(instructions)
    onClose()
  }

  const getDetails = () => {
    switch(actionType) {
      case 'summary': return { title: 'Generate Summary', desc: 'Create a concise summary of the document.' }
      case 'concepts': return { title: 'Extract Concepts', desc: 'Identify and explain key concepts.' }
      case 'resources': return { title: 'Find Resources', desc: 'Suggest additional learning materials.' }
      case 'plan': return { title: 'Study Plan', desc: 'Create a structured learning schedule.' }
      default: return { title: 'Generate Action', desc: '' }
    }
  }

  const details = getDetails()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-blue-500" size={24} />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{details.title}</h2>
              <p className="text-xs text-gray-500">{details.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{sourceName ? "Source" : "Topic"}</label>
            {sourceName ? (
              <div className="bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                {sourceName}
              </div>
            ) : (
              <div className="flex space-x-2">
                <input 
                  type="text"
                  placeholder="Enter a topic (e.g., Photosynthesis, The Cold War)"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                <button 
                  type="button"
                  onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('trigger-file-upload')); }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm border border-gray-200 dark:border-gray-700 whitespace-nowrap"
                >
                  Upload File
                </button>
              </div>
            )}
          </div>
          {sourceName && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Specific Instructions (Optional)</label>
            <input 
              type="text"
              placeholder="e.g., Make it 3 paragraphs long, Focus on chapter 2, etc."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#0F172A] border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleGenerate}
            className="flex items-center px-6 py-2 bg-[#0088FF] text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-md"
          >
            <Sparkles size={16} className="mr-2" />
            Generate
          </button>
        </div>

      </div>
    </div>
  )
}




