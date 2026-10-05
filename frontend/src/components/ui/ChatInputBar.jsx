import React, { useRef, useEffect } from 'react'
import { Plus, Mic, Send, FileText, X } from 'lucide-react'

export default function ChatInputBar({ 
  input, 
  setInput, 
  handleSend, 
  handleFileUpload, 
  startListening, 
  isListening, 
  isLoading,
  uploadingFile
}) {
  const fileInputRef = useRef(null)

  useEffect(() => {
    const handleUploadEvent = () => fileInputRef.current?.click();
    window.addEventListener('trigger-file-upload', handleUploadEvent);
    return () => window.removeEventListener('trigger-file-upload', handleUploadEvent);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-2">

      {/* ── Processing pill (shows while PDF is uploading) ── */}
      {uploadingFile && (
        <div className="mb-2 flex items-center gap-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm w-fit max-w-xs">
          {/* Spinner */}
          <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <svg
              className="animate-spin w-8 h-8 text-gray-300 dark:text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path
                d="M12 2 a10 10 0 0 1 10 10"
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <FileText size={13} className="absolute text-indigo-500" />
          </div>

          {/* File info */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[180px]">
              {uploadingFile.name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {uploadingFile.fileType?.includes('pdf') ? 'PDF' : 'Document'} · Uploading…
            </p>
          </div>
        </div>
      )}

      {/* ── Main input bar ── */}
      <form 
        onSubmit={handleSend} 
        className="flex items-center bg-white border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 shadow-sm dark:bg-[#1E293B]"
      >
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden"
          accept=".pdf,.docx,.pptx,image/png,image/jpeg,image/jpg,image/webp"
        />
        
        {/* Plus / Upload Button */}
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
        >
          <Plus size={20} strokeWidth={2} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1.5" />
        
        {/* Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything"
          className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 px-2"
        />
        
        {/* Right side buttons */}
        <div className="flex items-center space-x-2">
          {input.trim() ? (
            <button
              type="submit"
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={startListening}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white dark:text-black transition-all ${
                isListening ? 'bg-red-500 animate-pulse' : 'bg-black dark:bg-white hover:opacity-80'
              }`}
            >
              <Mic size={15} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}


