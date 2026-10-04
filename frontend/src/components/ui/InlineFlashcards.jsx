import React, { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Copy, Download, Check } from 'lucide-react'
import { motion } from 'framer-motion'

export default function InlineFlashcards({ flashcardsData, onBack }) {
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!flashcardsData || !flashcardsData.flashcards || flashcardsData.flashcards.length === 0) {
    return null
  }

  const card = flashcardsData.flashcards[currentCardIdx]

  const handleNext = () => {
    if (currentCardIdx < flashcardsData.flashcards.length - 1) {
      setIsFlipped(false)
      setCopied(false)
      setTimeout(() => setCurrentCardIdx(currentCardIdx + 1), 150)
    }
  }

  const handlePrev = () => {
    if (currentCardIdx > 0) {
      setIsFlipped(false)
      setCopied(false)
      setTimeout(() => setCurrentCardIdx(currentCardIdx - 1), 150)
    }
  }

  const handleCopy = (e, cardToCopy) => {
    e.stopPropagation()
    const text = `Term: ${cardToCopy.front}\nDefinition: ${cardToCopy.back}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1200
    canvas.height = 800

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 8
    ctx.strokeRect(0, 0, canvas.width, canvas.height)

    const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
      const words = text.split(' ')
      let line = ''
      let currentY = y
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' '
        const metrics = context.measureText(testLine)
        if (metrics.width > maxWidth && i > 0) {
          context.fillText(line, x, currentY)
          line = words[i] + ' '
          currentY += lineHeight
        } else {
          line = testLine
        }
      }
      context.fillText(line, x, currentY)
    }

    ctx.fillStyle = '#ec4899'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('TERM', 600, 80)

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 48px sans-serif'
    wrapText(ctx, card.front, 600, 150, 1000, 60)

    ctx.strokeStyle = '#e5e7eb'
    ctx.setLineDash([15, 15])
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(100, 400)
    ctx.lineTo(1100, 400)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#db2777'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('DEFINITION', 600, 460)

    ctx.fillStyle = '#374151'
    ctx.font = '32px sans-serif'
    wrapText(ctx, card.back, 600, 530, 1000, 46)

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `flashcard-${currentCardIdx + 1}.png`
    link.href = dataUrl
    link.click()
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center relative my-4">
      {onBack && (
         <div className="w-full flex justify-between items-center mb-6">
            <button 
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center transition-colors"
            >
                Back
            </button>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {flashcardsData.title} • Card {currentCardIdx + 1} of {flashcardsData.flashcards.length}
            </div>
         </div>
      )}
      {!onBack && (
        <div className="w-full text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
          {flashcardsData.title} • Card {currentCardIdx + 1} of {flashcardsData.flashcards.length}
        </div>
      )}
      
      <div 
        className="w-full h-80 sm:h-96 relative cursor-pointer group mb-8"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div 
            className="w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
        >
            {/* Front */}
            <div 
              className="absolute w-full h-full bg-white dark:bg-[#1E293B] border-2 border-gray-100 dark:border-gray-800 rounded-3xl shadow-lg p-10 flex flex-col items-center justify-center text-center hover:border-pink-200 dark:hover:border-gray-700 transition-colors"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-pink-500">
                  <span>Term</span>
                  <div className="flex space-x-2">
                    <button onClick={(e) => handleCopy(e, card)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Copy Full Card">
                        {copied && !isFlipped ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={handleDownload} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Download Full Card">
                        <Download size={16} />
                    </button>
                  </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-relaxed mt-4">
                  {card.front}
              </h2>
              <div className="absolute bottom-6 text-xs text-gray-400 animate-pulse">Click to flip</div>
            </div>

            {/* Back */}
            <div 
              className="absolute w-full h-full bg-pink-50 dark:bg-[#0F172A] border-2 border-pink-100 dark:border-pink-900/30 rounded-3xl shadow-lg p-10 flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400">
                  <span>Definition</span>
                  <div className="flex space-x-2">
                    <button onClick={(e) => handleCopy(e, card)} className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/50 rounded-full transition-colors" title="Copy Full Card">
                        {copied && isFlipped ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={handleDownload} className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/50 rounded-full transition-colors" title="Download Full Card">
                        <Download size={16} />
                    </button>
                  </div>
              </div>
              <p className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed overflow-y-auto mt-4">
                  {card.back}
              </p>
              <div className="absolute bottom-6 text-xs text-gray-400 opacity-70">Click to flip back</div>
            </div>
        </motion.div>
      </div>

      <div className="flex items-center space-x-6">
        <button 
            onClick={handlePrev}
            disabled={currentCardIdx === 0}
            className="w-14 h-14 rounded-full bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
            <ChevronLeft size={24} />
        </button>
        <div className="w-24 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
            {currentCardIdx + 1} / {flashcardsData.flashcards.length}
        </div>
        <button 
            onClick={handleNext}
            disabled={currentCardIdx === flashcardsData.flashcards.length - 1}
            className="w-14 h-14 rounded-full bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
            <ChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}
