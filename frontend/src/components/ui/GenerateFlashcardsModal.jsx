import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Layers, Upload } from 'lucide-react'

export default function GenerateFlashcardsModal({ isOpen, onClose, onGenerate, sourceName }) {
  const [count, setCount] = useState(10)
  const [topic, setTopic] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onGenerate({ count, topic })
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <Layers className="text-pink-500" size={24} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generate Flashcards</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {sourceName && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Source: <span className="font-semibold text-gray-700 dark:text-gray-300">{sourceName}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Flashcards
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {sourceName ? "Specific Topic / Focus (Optional)" : "Topic (Required)"}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Focus on dates and historical figures"
                  className="flex-1 bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-gray-100"
                />
                {!sourceName && (
                  <button 
                    type="button"
                    onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('trigger-file-upload')); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm border border-gray-200 dark:border-gray-700 whitespace-nowrap"
                  >
                    Upload File
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium shadow-md shadow-pink-500/20"
              >
                Generate
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}



