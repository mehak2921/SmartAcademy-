import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Mic, CheckCircle, FileText, BrainCircuit, Layers, BookOpen, Map, Loader2, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { useSearchParams, useNavigate } from 'react-router-dom'
import DocumentCard from '../components/ui/DocumentCard'
import ChatInputBar from '../components/ui/ChatInputBar'
import GenerateQuizModal from '../components/ui/GenerateQuizModal'
import GenerateFlashcardsModal from '../components/ui/GenerateFlashcardsModal'
import InlineQuiz from '../components/ui/InlineQuiz'
import InlineFlashcards from '../components/ui/InlineFlashcards'

export default function Chat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeDocuments, setActiveDocuments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(null)
  const [processingDocs, setProcessingDocs] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null) // persisted session ID
  const [selectedDocId, setSelectedDocId] = useState(null) // for UI tabs

  // Auto-select the first document if none is selected
  useEffect(() => {
    if (activeDocuments.length > 0 && !selectedDocId) {
      setSelectedDocId(activeDocuments[0].id)
    }
  }, [activeDocuments, selectedDocId])

  // Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false)
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false)
  const [activeFileForModal, setActiveFileForModal] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => { scrollToBottom() }, [messages])

  // Load session from URL or reset on ?new=
  useEffect(() => {
    const sessionId = searchParams.get('session')
    const isNew = searchParams.get('new')

    if (isNew) {
      // Clear everything for a fresh chat
      setMessages([])
      setActiveDocuments([])
      setProcessingDocs([])
      setCurrentSessionId(null)
      return
    }

    if (sessionId && sessionId !== currentSessionId) {
      // Load existing session history
      const loadSession = async () => {
        setIsLoading(true)
        try {
          const { data } = await supabase.auth.getSession()
          const token = data.session?.access_token
          const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/chat/sessions/${sessionId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          setCurrentSessionId(sessionId)
          // Map DB messages to UI format
          const uiMessages = res.data.messages.map(m => {
            if (m.content && typeof m.content === 'string' && m.content.startsWith('__WIDGET__:')) {
              const parts = m.content.split(':')
              const widgetType = parts[1]
              const jsonStr = parts.slice(2).join(':')
              try {
                return { role: m.role, type: widgetType, content: JSON.parse(jsonStr) }
              } catch (e) {
                return { role: m.role, content: m.content, type: m.type }
              }
            }
            return { role: m.role, content: m.content, type: m.type }
          })
          setMessages(uiMessages)
          setActiveDocuments(res.data.active_documents || [])
          setProcessingDocs([])
        } catch (err) {
          console.error('Failed to load session:', err)
        } finally {
          setIsLoading(false)
        }
      }
      loadSession()
    }
  }, [searchParams])

  // Poll processing status for pending docs every 5s
  useEffect(() => {
    if (processingDocs.length === 0) return
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        const ids = processingDocs.map(d => d.id).join(',')
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/documents/status?ids=${ids}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const completed = res.data.filter(d => d.processing_status === 'completed')
        if (completed.length > 0) {
          setProcessingDocs(prev => prev.filter(d => !completed.find(c => c.id === d.id)))
        }
      } catch (err) {
        console.error('Status poll error:', err)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [processingDocs])

  // Handles standard text messages
  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    
    await sendMessageToAI([...messages, userMsg], input)
  }

  const saveWidgetMessage = async (type, widgetData, title) => {
     try {
       const { data: sData } = await supabase.auth.getSession()
       const token = sData.session?.access_token
       const response = await axios.post(import.meta.env.VITE_API_URL + '/api/chat/widget', {
          session_id: currentSessionId,
          widget_type: type,
          widget_data: widgetData,
          title
       }, { headers: { Authorization: `Bearer ${token}` }})
       
       if (!currentSessionId && response.data.session_id) {
          setCurrentSessionId(response.data.session_id)
          navigate(`/dashboard/chat?session=${response.data.session_id}`, { replace: true })
          window.dispatchEvent(new Event('chat-session-updated'))
       }
     } catch (err) { console.error("Failed to save widget:", err) }
  }

  // Common function to send message to backend
  const sendMessageToAI = async (messageHistory, current_topic = "", docsOverride = null) => {
    setIsLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const validMessages = messageHistory
        .filter(m => m.content)
        .map(m => {
          if (typeof m.content === 'string') {
            return { role: m.role, content: m.content }
          }
          
          if (m.type === 'flashcards' && m.content.flashcards) {
            const cardsStr = m.content.flashcards.map(c => `Term: ${c.front}\nDefinition: ${c.back}`).join('\n\n')
            return { role: m.role, content: `[System Note: The user generated a Flashcards set titled "${m.content.title || 'Flashcards'}". Here are the contents:]\n\n${cardsStr}` }
          } else if (m.type === 'quiz' && m.content.questions) {
            const qsStr = m.content.questions.map((q, i) => `Q${i+1}: ${q.question}\nA: ${q.answer}`).join('\n\n')
            return { role: m.role, content: `[System Note: The user generated a Quiz titled "${m.content.title || 'Quiz'}". Here are the questions and answers:]\n\n${qsStr}` }
          }
          
          // Fallback for unknown object contents
          return { role: m.role, content: JSON.stringify(m.content).substring(0, 500) + '...' }
        })

      const docs = docsOverride ?? activeDocuments

      const response = await axios.post(import.meta.env.VITE_API_URL + '/api/chat/', {
        messages: validMessages,
        current_topic: current_topic,
        active_documents: docs.map(d => ({ id: d.id, name: d.name })),
        session_id: currentSessionId  // null on first message, backend creates session
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Persist session ID returned by backend
      if (!currentSessionId && response.data.session_id) {
        setCurrentSessionId(response.data.session_id)
        // Update URL to reflect session without full navigation
        navigate(`/dashboard/chat?session=${response.data.session_id}`, { replace: true })
        // Tell sidebar to refresh
        window.dispatchEvent(new Event('chat-session-updated'))
      }

      const responseData = response.data.response
      if (typeof responseData === 'string' && responseData.startsWith('__WIDGET__:')) {
         try {
           const parts = responseData.split(':')
            const widgetType = parts[1]
            const jsonStr = parts.slice(2).join(':')
            const parsed = JSON.parse(jsonStr)
            setMessages(prev => [...prev, { role: 'assistant', type: widgetType, content: parsed }])
         } catch(e) {
           console.error("Failed to parse live widget", e)
           setMessages(prev => [...prev, { role: 'assistant', content: responseData }])
         }
      } else {
         setMessages(prev => [...prev, { role: 'assistant', content: responseData }])
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'system', content: "Sorry, I couldn't process that request." }])
    } finally {
      setIsLoading(false)
    }
  }


  // Handle uploading a document directly in chat
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Reset input so the same file can be re-selected
    e.target.value = ''
    
    setUploadingFile({ name: file.name, fileType: file.type })
    setIsLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await axios.post(import.meta.env.VITE_API_URL + '/api/documents/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      })
      
      const docObj = { id: uploadRes.data.document_id, name: file.name, file }
      setActiveDocuments(prev => [...prev, docObj])
      // Start polling for this doc's processing status
      setProcessingDocs(prev => [...prev, { id: uploadRes.data.document_id, name: file.name }])
      
      setMessages(prev => [
        ...prev,
        { role: 'system', content: `Document "${file.name}" uploaded and is being processed. You can use the quick actions in the top document bar once it's ready!` }
      ])

    } catch (error) {
      console.error(error)
      setMessages(prev => [
        ...prev,
        { role: 'system', content: 'Failed to upload document. Please try again.' }
      ])
    } finally {
      setUploadingFile(null)
      setIsLoading(false)
    }
  }

  const handleDocumentAction = (action, document) => {
    const promptMap = {
      'summary': `Generate a detailed summary for this document: "${document.name}"`,
      'concepts': `Extract the key concepts from this document: "${document.name}"`,
      'resources': `Suggest useful learning resources for this document: "${document.name}"`,
      'plan': `Create a structured study plan for this document: "${document.name}"`
    }

    if (promptMap[action]) {
       const prompt = promptMap[action]
       const userMsg = { role: 'user', content: prompt }
       setMessages(prev => [...prev, userMsg])
       const title = action.charAt(0).toUpperCase() + action.slice(1)
         sendMessageToAI([...messages, userMsg], `${title} for ${document.name}`, [document])
    } else if (action === 'quiz') {
       setActiveFileForModal(document)
       setIsQuizModalOpen(true)
    } else if (action === 'flashcards') {
       setActiveFileForModal(document)
       setIsFlashcardModalOpen(true)
    }
  }

  const handleGenerateFlashcards = async ({ count, topic }) => {
    setIsLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const response = await axios.post(import.meta.env.VITE_API_URL + '/api/flashcards/generate', {
        topic: topic || null,
        active_documents: activeFileForModal ? [activeFileForModal.id] : activeDocuments.map(d => d.id),
        count
      }, { headers: { Authorization: `Bearer ${token}` } })

      const newMsg = { role: 'assistant', type: 'flashcards', content: response.data }
      setMessages(prev => [...prev, newMsg])
      await saveWidgetMessage('flashcards', response.data, response.data.title)
    } catch (error) {
       console.error(error)
       setMessages(prev => [...prev, { role: 'system', content: (error.response?.data?.detail || "Failed to generate flashcards.").toString().replace(/^\d+:\s*/, "") }])
    } finally {
      setIsLoading(false)
      setActiveFileForModal(null)
    }
  }

  const handleGenerateQuiz = async ({ difficulty, quizType, count }) => {
     setIsLoading(true)
     try {
       const { data } = await supabase.auth.getSession()
       const token = data.session?.access_token
       const response = await axios.post(import.meta.env.VITE_API_URL + '/api/quiz/generate', {
         topic: null,
         active_documents: activeFileForModal ? [activeFileForModal.id] : activeDocuments.map(d => d.id),
         difficulty,
         type: quizType,
         count
       }, { headers: { Authorization: `Bearer ${token}` } })

       const newMsg = { role: 'assistant', type: 'quiz', content: response.data }
       setMessages(prev => [...prev, newMsg])
       await saveWidgetMessage('quiz', response.data, response.data.title)
     } catch(err) {
       console.error(err)
       setMessages(prev => [...prev, { role: 'system', content: (error.response?.data?.detail || "Failed to generate quiz.").toString().replace(/^\d+:\s*/, "") }])
     } finally {
       setIsLoading(false)
       setActiveFileForModal(null)
     }
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition.")
      return
    }
    const recognition = new window.webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => setInput(event.results[0][0].transcript)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  // Handle auto-send message from URL (e.g. from Home page cards)
  useEffect(() => {
    const initialMsg = searchParams.get('msg')
    const isNew = searchParams.get('new')
    
    if (isNew && initialMsg && messages.length === 0 && !isLoading) {
      // Remove msg from URL so it doesn't trigger repeatedly on refresh
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('msg')
      navigate({ search: newParams.toString() }, { replace: true })
      
      const userMsg = { role: 'user', content: initialMsg }
      setMessages([userMsg])
      sendMessageToAI([userMsg], initialMsg)
    }
  }, [searchParams, messages.length, isLoading])

    // Handle action from Home page
    useEffect(() => {
      const action = searchParams.get('action')
      if (action && !isLoading && messages.length === 0) {
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('action')
        navigate({ search: newParams.toString() }, { replace: true })

        if (action === 'quiz') {
          setIsQuizModalOpen(true)
        } else if (action === 'flashcards') {
          setIsFlashcardModalOpen(true)
        } else {
          const promptMap = {
            'summary': "Generate a detailed summary.",
            'concepts': "Explain the key concepts.",
            'resources': "Suggest useful learning resources.",
            'plan': "Create a structured study plan."
          }
          if (promptMap[action]) {
            const prompt = promptMap[action]
            const userMsg = { role: 'user', content: prompt }
            setMessages([userMsg])
            const title = action.charAt(0).toUpperCase() + action.slice(1)
            sendMessageToAI([userMsg], title)
          }
        }
      }
    }, [searchParams, messages.length, isLoading])

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] relative max-w-7xl mx-auto w-full">
      
      {/* ── Premium Document Status Bar ── */}
      {activeDocuments.length > 0 && messages.length > 0 && (
        <div className="z-20 w-full bg-white dark:bg-[#0f172a]">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="border-b border-gray-200 dark:border-slate-700/50 shadow-sm px-4 py-1.5 flex flex-col gap-1.5">
              
              {/* Tabs Row */}
              <LayoutGroup>
                <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 flex-shrink-0 flex items-center gap-1">
                    <Zap size={12} className="text-indigo-500" />
                    Workspace
                  </span>
                  
                  {activeDocuments.map(doc => {
                    const isProcessing = processingDocs.some(d => d.id === doc.id)
                    const isSelected = selectedDocId === doc.id
                    return (
                      <button 
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex-shrink-0 border ${
                          isSelected 
                            ? 'text-white border-transparent shadow-sm' 
                            : 'text-slate-600 dark:text-slate-300 border-white/40 dark:border-slate-700 hover:bg-white/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected && (
                          <motion.div 
                            layoutId="activeTab" 
                            className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg -z-10" 
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          />
                        )}
                        
                        {isProcessing ? (
                          <Loader2 size={14} className={`animate-spin ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                        ) : (
                          <CheckCircle size={14} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                        )}
                        <span className="max-w-[120px] truncate">{doc.name}</span>
                        <span className={`text-[9px] ml-1 px-1.5 py-[1px] rounded-full font-bold uppercase tracking-wide ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {isProcessing ? 'Processing' : 'Ready'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </LayoutGroup>

              {/* Selected Document Actions */}
              <AnimatePresence mode="wait">
                {selectedDocId && (
                  <motion.div
                    key={selectedDocId}
                    initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                    exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.2 }}
                  >
                    {(() => {
                      const doc = activeDocuments.find(d => d.id === selectedDocId)
                      const isProcessing = processingDocs.some(d => d.id === selectedDocId)
                      if (!doc) return null
                      
                      return (
                        <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center gap-2">
                          {isProcessing ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-1.5">
                              <Loader2 size={14} className="animate-spin text-indigo-500" />
                              Analyzing document semantics. Please wait...
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 py-1">
                              
                              <button onClick={() => handleDocumentAction('summary', doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
                                <FileText size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Summary</span>
                              </button>
                              
                              <button onClick={() => handleDocumentAction('quiz', doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
                                <BrainCircuit size={14} className="text-purple-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Quiz</span>
                              </button>
                              
                              <button onClick={() => handleDocumentAction('flashcards', doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
                                <Layers size={14} className="text-green-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Flashcards</span>
                              </button>
                              
                              <button onClick={() => handleDocumentAction('concepts', doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
                                <Map size={14} className="text-teal-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Concepts</span>
                              </button>
                              
                              <button onClick={() => handleDocumentAction('resources', doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
                                <BookOpen size={14} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Resources</span>
                              </button>
                              
                              <button onClick={() => handleDocumentAction('plan', doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
                                <Zap size={14} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Study Plan</span>
                              </button>
                              
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}      {/* Messages Feed or Blank State */}
      <div className={`flex-1 flex flex-col ${messages.length === 0 ? 'items-center justify-center -mt-20' : 'overflow-y-auto pb-4 scrollbar-hide'}`}>
        <div className="px-4 space-y-8 pt-4">
        {messages.length === 0 ? (
          <>
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <Bot size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">How can I help you today?</h1>
          </>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'document' ? (
                  <DocumentCard document={msg.document} onAction={handleDocumentAction} />
                ) : msg.type === 'flashcards' ? (
                  <InlineFlashcards flashcardsData={msg.content} />
                ) : msg.type === 'quiz' ? (
                  <InlineQuiz quizData={msg.content} />
                ) : (
                  <div className={`flex max-w-[85%] min-w-0 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-blue-600 ml-4' : 'bg-green-500 mr-4'}`}>
                      {msg.role === 'user' ? <User size={16} className="text-white"/> : <Bot size={16} className="text-white"/>}
                    </div>
                    <div className={`p-5 rounded-2xl overflow-x-auto min-w-0 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white dark:bg-[#1E293B] shadow-sm border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200"}`}>
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline font-medium" />
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                 <div className="flex max-w-[85%] flex-row">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 bg-green-500 mr-4">
                      <Bot size={16} className="text-white"/>
                    </div>
                    <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
        </div>
      </div>

      {/* Input Bar */}
      <div className={messages.length === 0 
        ? "absolute left-0 right-0 bottom-1/3 px-4 transition-all duration-300" 
        : "w-full bg-white dark:bg-[#0f172a] pt-4 pb-6 px-4 z-20 flex-shrink-0 transition-all duration-300 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.5)]"}>
        <ChatInputBar 
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleFileUpload={handleFileUpload}
          startListening={startListening}
          isListening={isListening}
          isLoading={isLoading}
          uploadingFile={uploadingFile}
        />
        {messages.length > 0 && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium tracking-wide">
            SMART ACADEMY AI CAN MAKE MISTAKES. VERIFY IMPORTANT INFORMATION.
          </p>
        )}
      </div>

      <GenerateQuizModal 
         isOpen={isQuizModalOpen} 
         onClose={() => setIsQuizModalOpen(false)} 
         onGenerate={handleGenerateQuiz} 
         sourceName={activeFileForModal ? activeFileForModal.name : null} 
      />
      <GenerateFlashcardsModal 
         isOpen={isFlashcardModalOpen} 
         onClose={() => setIsFlashcardModalOpen(false)} 
         onGenerate={handleGenerateFlashcards} 
         sourceName={activeFileForModal ? activeFileForModal.name : null} 
      />

    </div>
  )
}






