import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, ChevronRight, Loader2, Award, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../services/supabase'

export default function InlineQuiz({ quizData, mode = 'Practice', onBack }) {
  const [appState, setAppState] = useState('playing') // 'playing', 'results'
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) 
  const [currentInput, setCurrentInput] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)

  if (!quizData || !quizData.questions || quizData.questions.length === 0) return null

  const handleAnswerSubmit = async () => {
    if (!currentInput.trim()) return

    const question = quizData.questions[currentQuestionIdx]
    let isCorrect = false
    let explanation = ''

    if (question.type === 'MCQ') {
       isCorrect = currentInput === question.answer
       explanation = isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.answer}`
    } else {
       setIsEvaluating(true)
       try {
         const { data: sessionData } = await supabase.auth.getSession()
         const token = sessionData.session?.access_token
         const evalRes = await axios.post('${import.meta.env.VITE_API_URL}/api/quiz/evaluate', {
            question: question.question,
            expected_answer: question.answer,
            user_answer: currentInput
         }, {
            headers: { Authorization: `Bearer ${token}` }
         })
         isCorrect = evalRes.data.is_correct
         explanation = evalRes.data.explanation
       } catch (err) {
         console.error(err)
         isCorrect = false
         explanation = 'Failed to evaluate answer. Expected: ' + question.answer
       }
       setIsEvaluating(false)
    }

    setUserAnswers(prev => ({
       ...prev,
       [currentQuestionIdx]: { answer: currentInput, isCorrect, explanation }
    }))
  }

  const handleNext = async () => {
    if (currentQuestionIdx < quizData.questions.length - 1) {
       setCurrentQuestionIdx(currentQuestionIdx + 1)
       setCurrentInput('')
    } else {
       setAppState('results')
       if (mode === 'Test') saveQuizResult()
    }
  }

  const saveQuizResult = async () => {
     try {
       const { data: sessionData } = await supabase.auth.getSession()
       const token = sessionData.session?.access_token
       
       let correctCount = 0
       Object.values(userAnswers).forEach(ans => {
          if(ans.isCorrect) correctCount++
       })
       const score = Math.round((correctCount / quizData.questions.length) * 100)

       await axios.post('${import.meta.env.VITE_API_URL}/api/quiz/save', {
          title: quizData.title,
          score: score,
          content: { questions: quizData.questions, answers: userAnswers, mode }
       }, {
          headers: { Authorization: `Bearer ${token}` }
       })
     } catch (err) {
       console.error("Failed to save quiz", err)
     }
  }

  const renderPlaying = () => {
     const question = quizData.questions[currentQuestionIdx]
     const hasAnswered = !!userAnswers[currentQuestionIdx]
     const showFeedback = mode === 'Practice' && hasAnswered

     return (
       <div className="w-full max-w-3xl mx-auto my-4">
         <div className="mb-4 flex justify-between items-center text-sm font-medium text-gray-500 dark:text-gray-400">
           {onBack && (
              <button onClick={onBack} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center">
                 <ArrowLeft size={16} className="mr-1"/> Back
              </button>
           )}
           <span>{quizData.title} • {mode} Mode</span>
           <span>Question {currentQuestionIdx + 1} of {quizData.questions.length}</span>
         </div>
         
         <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mb-8">
            <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIdx + 1) / quizData.questions.length) * 100}%` }}></div>
         </div>

         <AnimatePresence mode="wait">
           <motion.div 
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
           >
             <div className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-500">{question.type}</div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{question.question}</h2>
             
             {question.type === 'MCQ' ? (
                <div className="space-y-3">
                  {question.options.map((opt, i) => (
                    <button
                      key={i}
                      disabled={hasAnswered}
                      onClick={() => setCurrentInput(opt)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                         currentInput === opt 
                         ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' 
                         : 'border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                      } ${hasAnswered ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
             ) : question.type === 'Fill in the blanks' ? (
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  disabled={hasAnswered}
                  placeholder="Type the missing word(s)..."
                  className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                />
             ) : (
                <textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  disabled={hasAnswered}
                  rows={4}
                  placeholder="Type your answer here..."
                  className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 disabled:opacity-70 resize-none"
                />
             )}

             {showFeedback && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                   className={`mt-6 p-4 rounded-xl flex items-start space-x-3 ${userAnswers[currentQuestionIdx].isCorrect ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}
                >
                   {userAnswers[currentQuestionIdx].isCorrect ? <CheckCircle className="mt-0.5 flex-shrink-0" /> : <XCircle className="mt-0.5 flex-shrink-0" />}
                   <div>
                      <p className="font-semibold">{userAnswers[currentQuestionIdx].isCorrect ? 'Correct!' : 'Incorrect'}</p>
                      <p className="text-sm mt-1">{userAnswers[currentQuestionIdx].explanation}</p>
                   </div>
                </motion.div>
             )}

             <div className="mt-8 flex justify-end space-x-4">
                {!hasAnswered ? (
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={!currentInput.trim() || isEvaluating}
                    className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {isEvaluating ? <Loader2 size={20} className="animate-spin" /> : 'Submit Answer'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                  >
                    {currentQuestionIdx < quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    <ChevronRight size={20} className="ml-1" />
                  </button>
                )}
             </div>
           </motion.div>
         </AnimatePresence>
       </div>
     )
  }

  const renderResults = () => {
    let correctCount = 0
    Object.values(userAnswers).forEach(ans => {
       if(ans.isCorrect) correctCount++
    })
    const score = Math.round((correctCount / quizData.questions.length) * 100)

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 my-4">
         <div className="bg-white dark:bg-[#1E293B] p-10 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
            <Award size={64} className={`mx-auto mb-6 ${score >= 80 ? 'text-yellow-400' : score >= 50 ? 'text-blue-400' : 'text-red-400'}`} />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Quiz Complete!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{mode === 'Test' ? 'Your score has been saved.' : 'Practice session finished.'}</p>
            
            <div className="inline-block p-6 rounded-2xl bg-gray-50 dark:bg-[#0F172A] border border-gray-100 dark:border-gray-700">
               <div className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Your Score</div>
               <div className={`text-6xl font-black ${score >= 80 ? 'text-green-500' : score >= 50 ? 'text-blue-500' : 'text-red-500'}`}>
                  {score}%
               </div>
               <div className="text-sm font-medium text-gray-500 mt-2">{correctCount} out of {quizData.questions.length} correct</div>
            </div>

            {onBack && (
              <div className="mt-10">
                 <button 
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-colors inline-flex items-center"
                 >
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                 </button>
              </div>
            )}
         </div>

         <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white px-2">Detailed Review</h3>
            {quizData.questions.map((q, i) => {
               const ans = userAnswers[i]
               return (
                  <div key={i} className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                     <div className="flex items-start space-x-4">
                        <div className="mt-1">
                           {ans?.isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-gray-900 dark:text-white mb-2">Q{i+1}: {q.question}</h4>
                           {ans ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#0F172A]">
                                   <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your Answer</span>
                                   <span className="text-gray-800 dark:text-gray-200">{ans.answer}</span>
                                </div>
                                {!ans.isCorrect && (
                                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                     <span className="block text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Expected Answer</span>
                                     <span className="text-gray-800 dark:text-gray-200">{q.answer}</span>
                                  </div>
                                )}
                             </div>
                           ) : (
                             <div className="text-sm mt-4 text-gray-500">Unanswered</div>
                           )}
                           {ans?.explanation && !ans.isCorrect && q.type !== 'MCQ' && (
                              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                 <strong>Evaluation:</strong> {ans.explanation}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )
            })}
         </div>
      </div>
    )
  }

  return appState === 'playing' ? renderPlaying() : renderResults()
}
