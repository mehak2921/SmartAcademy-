import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckSquare, List, BookOpen, Book, Map, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const cards = [
  {
    title: 'Summary',
    description: 'Generate concise summaries from your documents.',
    icon: FileText,
    color: 'bg-blue-500',
    path: '/dashboard/chat?action=summary'
  },
  {
    title: 'Quiz',
    description: 'Test your knowledge with AI-generated quizzes.',
    icon: CheckSquare,
    color: 'bg-purple-500',
    path: '/dashboard/chat?action=quiz'
  },
  {
    title: 'Flashcards',
    description: 'Review key terms and concepts quickly.',
    icon: List,
    color: 'bg-pink-500',
    path: '/dashboard/chat?action=flashcards'
  },
  {
    title: 'Concepts',
    description: 'Extract and explain complex topics.',
    icon: BookOpen,
    color: 'bg-green-500',
    path: '/dashboard/chat?action=concepts'
  },
  {
    title: 'Resources',
    description: 'Find related learning materials.',
    icon: Book,
    color: 'bg-yellow-500',
    path: '/dashboard/chat?action=resources'
  },
  {
    title: 'Study Plan',
    description: 'Create a personalized learning schedule.',
    icon: Map,
    color: 'bg-orange-500',
    path: '/dashboard/chat?action=plan'
  },
  {
    title: 'AI Chat',
    description: 'Chat directly with the AI assistant.',
    icon: MessageSquare,
    color: 'bg-indigo-500',
    path: '/dashboard/chat'
  }
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto pt-16 pb-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Welcome to Smart Academy</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">What would you like to learn today?</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(card.path)}
            className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 hover:-translate-y-1 transition-all duration-200 ${card.title === 'AI Chat' ? 'md:col-span-2 lg:col-span-3' : ''}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.color} shadow-sm`}>
              <card.icon size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{card.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{card.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
