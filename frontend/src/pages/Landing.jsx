import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BrainCircuit, BookOpen, Layers, Zap, FileText, CheckSquare, LayoutList, Library, HelpCircle, MessageSquare, BarChart } from 'lucide-react'
import ProfileDropdown from '../components/ui/ProfileDropdown'

const features = [
  { name: 'Instant Summary', icon: FileText, iconColor: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-500/10', desc: 'Turn lengthy PDFs and lectures into concise, readable summaries in seconds. Perfect for quick reviews.' },
  { name: 'Adaptive Quizzes', icon: CheckSquare, iconColor: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-500/10', desc: 'Challenge yourself with AI-generated multiple choice quizzes designed to test your true understanding.' },
  { name: 'Smart Flashcards', icon: LayoutList, iconColor: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-500/10', desc: 'Automatically extract key concepts and test your memory with interactive flipping flashcards.' },
  { name: 'Core Concepts', icon: BookOpen, iconColor: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-500/10', desc: 'Extract the most important topics and definitions from your documents, explained simply.' },
  { name: 'Learning Resources', icon: Library, iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10', desc: 'Find related YouTube videos, articles, and textbooks to dive deeper into your subjects.' },
  { name: 'Study Plan', icon: HelpCircle, iconColor: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10', desc: 'Create a personalized, day-by-day learning schedule based on your upload material.' },
]

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <BrainCircuit size={32} className="text-blue-600 dark:text-blue-500" />
          <span className="text-2xl font-extrabold tracking-tight">Smart Academy</span>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-semibold hover:text-blue-600 transition-colors">Workspace</Link>
              <Link to="/dashboard/analytics" className="text-sm font-semibold hover:text-blue-600 transition-colors">Analytics</Link>
              <ProfileDropdown position="bottom" />
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold hover:text-blue-600 transition-colors">Log In</Link>
              <Link to="/register" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center px-4 max-w-6xl mx-auto pt-20 pb-24 w-full">
        <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full mb-8">
          <Zap size={16} />
          <span className="text-sm font-medium">Your AI-Powered Learning Hub</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Master any subject with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Intelligent AI</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
          Upload your documents and let Smart Academy automatically generate summaries, interactive quizzes, flashcards, and personalized study plans.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          {user ? (
            <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30">
              Go to Workspace
            </Link>
          ) : (
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30">
              Get Started for Free
            </Link>
          )}
        </div>

        {/* AI Chat Banner (Wide Feature) */}
        <div className="mt-24 w-full text-left bg-white dark:bg-[#1E293B] rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center">
              <MessageSquare size={32} className="text-indigo-500" />
            </div>
            <h2 className="text-3xl font-bold">Conversational AI Chat</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Don't just read your documents—talk to them. Ask questions, request detailed explanations, or brainstorm ideas directly with an AI assistant that has full context of your uploaded materials.
            </p>
          </div>
          <div className="flex-1 w-full max-w-md bg-gray-50 dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 shadow-inner">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-sm">
                Can you explain the main concept of chapter 3?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%] shadow-sm">
                Absolutely! Chapter 3 focuses on neural network backpropagation. Here is a quick breakdown...
              </div>
            </div>
          </div>
        </div>

        {/* Visual Samples Section */}
        <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Quiz Sample */}
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-lg flex items-center justify-center">
                <CheckSquare size={20} className="text-purple-500" />
              </div>
              <h3 className="text-xl font-bold">Interactive Quizzes</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8 flex-1">
              Test your knowledge instantly. Smart Academy generates challenging multiple-choice quizzes directly from your reading material.
            </p>
            {/* Mockup */}
            <div className="bg-gray-50 dark:bg-[#0F172A] rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-sm mb-4 text-gray-800 dark:text-gray-200">What is the primary function of Mitochondria?</p>
              <div className="space-y-2">
                <div className="w-full bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400">A. Protein synthesis</div>
                <div className="w-full bg-green-50 dark:bg-green-900/20 border-2 border-green-500 p-3 rounded-lg text-sm font-medium text-green-700 dark:text-green-400 flex justify-between items-center">
                  <span>B. Energy production (ATP)</span>
                  <CheckSquare size={16} />
                </div>
                <div className="w-full bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400">C. Cell division</div>
              </div>
            </div>
          </div>

          {/* Flashcard Sample */}
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-pink-50 dark:bg-pink-500/10 rounded-lg flex items-center justify-center">
                <LayoutList size={20} className="text-pink-500" />
              </div>
              <h3 className="text-xl font-bold">Smart Flashcards</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8 flex-1">
              Review key terms effortlessly. Our AI extracts the most important concepts and creates digital flashcards you can flip through.
            </p>
            {/* Mockup */}
            <div className="relative perspective-1000">
              <div className="w-full h-48 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg flex items-center justify-center p-6 text-white text-center transform transition-transform hover:scale-[1.02] cursor-pointer">
                <div>
                  <span className="text-pink-100 text-xs font-semibold tracking-wider uppercase block mb-2">Key Term</span>
                  <h4 className="text-2xl font-bold">Photosynthesis</h4>
                  <p className="mt-4 text-pink-50 text-sm opacity-90 max-w-xs mx-auto">
                    The process used by plants to convert light energy into chemical energy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Banner (Wide Feature) */}
        <div className="mt-8 w-full text-left bg-white dark:bg-[#1E293B] rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <BarChart size={32} className="text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold">Learning Analytics</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Track your progress over time. Keep an eye on your learning streaks, average quiz scores, study time, and identify your weak topics so you know exactly what to review next.
            </p>
          </div>
          <div className="flex-1 w-full max-w-md bg-gray-50 dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-inner">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center"><BarChart size={18} className="mr-2 text-blue-600"/> Learning Analytics</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Quizzes Taken</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Average Score</p>
                <p className="text-2xl font-bold text-green-600">85%</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold mb-3">Learning Streak</p>
              <div className="flex justify-between items-end h-10">
                <div className="w-6 bg-gray-200 dark:bg-gray-700 rounded-sm h-4"></div>
                <div className="w-6 bg-gray-200 dark:bg-gray-700 rounded-sm h-6"></div>
                <div className="w-6 bg-gray-200 dark:bg-gray-700 rounded-sm h-4"></div>
                <div className="w-6 bg-gray-200 dark:bg-gray-700 rounded-sm h-3"></div>
                <div className="w-6 bg-green-500 rounded-sm h-8"></div>
                <div className="w-6 bg-green-500 rounded-sm h-10"></div>
                <div className="w-6 bg-gray-200 dark:bg-gray-700 rounded-sm h-2"></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>M</span><span>T</span><span>W</span><span>T</span><span className="text-green-600 font-bold">F</span><span className="text-green-600 font-bold">S</span><span>S</span>
              </div>
            </div>
          </div>
        </div>

        {/* All Actions / Features Grid */}
        <div className="mt-16 w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need to learn faster</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">One unified workspace with multiple powerful AI tools.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div key={idx} className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow group">
                  <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon size={28} className={feature.iconColor} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-800">
        &copy; {new Date().getFullYear()} Mehak. All rights reserved.
      </footer>
    </div>
  )
}
