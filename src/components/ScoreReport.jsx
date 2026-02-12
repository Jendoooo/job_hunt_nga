import { useState } from 'react'
import AIExplainer from './AIExplainer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
    Trophy, Star, ThumbsUp, CheckCircle2, AlertTriangle,
    Clock, Flag, XCircle, RotateCcw, ArrowLeft, ClipboardList, Check
} from 'lucide-react'

export default function ScoreReport({
    questions,
    answers,
    flagged = [],
    timeTaken,
    totalTime,
    assessmentType,
    moduleName,
    mode,
    onRetry,
    onBackToDashboard
}) {
    const { user } = useAuth()
    const [reviewMode, setReviewMode] = useState(false)
    const [currentReview, setCurrentReview] = useState(0)
    const [saved, setSaved] = useState(false)

    const correctCount = questions.reduce((count, q, i) => {
        return count + (answers[i] === q.correctAnswer ? 1 : 0)
    }, 0)

    const score = Math.round((correctCount / questions.length) * 100)
    const incorrectAnswers = questions.map((q, i) => ({ ...q, index: i }))
        .filter((q, i) => answers[q.index] !== q.correctAnswer)

    // Save to Supabase
    async function saveResults() {
        if (!user || saved) return
        try {
            const { error } = await supabase.from('test_attempts').insert({
                user_id: user.id,
                assessment_type: assessmentType,
                module_name: moduleName,
                score: correctCount,
                total_questions: questions.length,
                time_taken_seconds: timeTaken,
                mode: mode,
                answers: answers,
            })
            if (error) throw error
            setSaved(true)
        } catch (err) {
            console.error('Failed to save results:', err)
        }
    }

    // Auto-save on mount
    useState(() => {
        saveResults()
    })

    function getGrade() {
        if (score >= 90) return { label: 'Excellent', icon: Trophy, color: '#10b981' }
        if (score >= 75) return { label: 'Very Good', icon: Star, color: '#3b82f6' }
        if (score >= 60) return { label: 'Good', icon: ThumbsUp, color: '#8b5cf6' }
        if (score >= 50) return { label: 'Pass', icon: CheckCircle2, color: '#f59e0b' }
        return { label: 'Needs Improvement', icon: AlertTriangle, color: '#ef4444' }
    }

    const grade = getGrade()

    if (reviewMode) {
        const q = incorrectAnswers[currentReview]
        return (
            <div className="max-w-3xl mx-auto p-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        className="btn btn--ghost flex items-center gap-2"
                        onClick={() => setReviewMode(false)}
                    >
                        <ArrowLeft size={16} /> Back to Results
                    </button>
                    <span className="text-sm font-semibold text-slate-500">
                        Reviewing Wrong Answer {currentReview + 1} of {incorrectAnswers.length}
                    </span>
                </div>

                <div className="bg-white border boundary-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            Question {q.index + 1}
                        </span>
                    </div>
                    <div className="text-lg text-slate-800 mb-6 leading-relaxed font-medium">{q.question}</div>
                    <div className="space-y-3">
                        {q.options.map((option, oi) => (
                            <div
                                key={oi}
                                className={`flex items-center gap-3 p-4 border-2 rounded-lg text-sm transition-colors
                                ${oi === q.correctAnswer
                                        ? 'border-green-500 bg-green-50 text-green-900'
                                        : answers[q.index] === oi && oi !== q.correctAnswer
                                            ? 'border-red-200 bg-red-50 text-red-900'
                                            : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                            >
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold border
                                    ${oi === q.correctAnswer
                                        ? 'bg-green-500 text-white border-green-500'
                                        : answers[q.index] === oi && oi !== q.correctAnswer
                                            ? 'bg-red-500 text-white border-red-500'
                                            : 'bg-white text-slate-500 border-slate-200'}`}
                                >
                                    {String.fromCharCode(65 + oi)}
                                </span>
                                <span className="flex-1 font-medium">{option}</span>
                                {oi === q.correctAnswer && <CheckCircle2 className="text-green-600" size={20} />}
                                {answers[q.index] === oi && oi !== q.correctAnswer && <XCircle className="text-red-500" size={20} />}
                            </div>
                        ))}
                    </div>
                    {q.explanation && (
                        <div className="mt-6 p-4 bg-slate-50 border-l-4 border-blue-500 text-slate-700 text-sm leading-relaxed rounded-r-lg">
                            <strong className="block text-blue-700 mb-1">Explanation:</strong> {q.explanation}
                        </div>
                    )}
                    <div className="mt-6">
                        <AIExplainer question={q} />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button
                        className="btn btn--secondary flex items-center gap-2"
                        onClick={() => setCurrentReview(Math.max(0, currentReview - 1))}
                        disabled={currentReview === 0}
                    >
                        <ArrowLeft size={16} /> Previous
                    </button>
                    <button
                        className="btn btn--secondary flex items-center gap-2"
                        onClick={() => setCurrentReview(Math.min(incorrectAnswers.length - 1, currentReview + 1))}
                        disabled={currentReview === incorrectAnswers.length - 1}
                    >
                        Next <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className={`text-center p-10 bg-white border border-slate-200 rounded-2xl mb-6 relative overflow-hidden shadow-sm`}>
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${score >= 50 ? 'from-green-500 to-emerald-400' : 'from-red-500 to-orange-400'
                    }`} />

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-3xl">
                    <grade.icon size={32} color={grade.color} />
                </div>

                <h2 className="text-4xl font-bold mb-1" style={{ color: grade.color }}>
                    {grade.label}
                </h2>

                <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-black tracking-tighter text-slate-900">
                        {score}%
                    </span>
                    <span className="text-slate-400 font-medium">
                        ({correctCount}/{questions.length} correct)
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 border border-slate-200 rounded-xl text-center shadow-sm">
                    <Clock className="w-5 h-5 mx-auto text-blue-500 mb-2" />
                    <span className="block text-lg font-bold text-slate-800 tabular-nums">
                        {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Time Taken</span>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-xl text-center shadow-sm">
                    <Clock className="w-5 h-5 mx-auto text-slate-400 mb-2" />
                    <span className="block text-lg font-bold text-slate-800 tabular-nums">
                        {Math.floor(totalTime / 60)}m
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Allowed</span>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-xl text-center shadow-sm">
                    <XCircle className="w-5 h-5 mx-auto text-slate-400 mb-2" />
                    <span className="block text-lg font-bold text-slate-800 tabular-nums">
                        {questions.length - Object.keys(answers).length}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skipped</span>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-xl text-center shadow-sm">
                    <Flag className="w-5 h-5 mx-auto text-amber-500 mb-2" />
                    <span className="block text-lg font-bold text-slate-800 tabular-nums">{flagged.length}</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Flagged</span>
                </div>
            </div>

            {saved && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium mb-8 bg-green-50 py-2 rounded-lg border border-green-100">
                    <Check size={16} /> Results saved to your profile
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
                {incorrectAnswers.length > 0 && (
                    <button
                        className="btn btn--primary flex-1 flex items-center justify-center gap-2"
                        onClick={() => setReviewMode(true)}
                    >
                        <ClipboardList size={18} /> Review Best Answers
                    </button>
                )}
                <button className="btn btn--secondary flex-1 flex items-center justify-center gap-2" onClick={onRetry}>
                    <RotateCcw size={18} /> Retry Test
                </button>
                <button className="btn btn--ghost flex-1 flex items-center justify-center gap-2" onClick={onBackToDashboard}>
                    <ArrowLeft size={18} /> Dashboard
                </button>
            </div>
        </div>
    )
}
