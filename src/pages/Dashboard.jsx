import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { generateQuestions } from '../services/deepseek'
import {
    Target, LogOut, Settings, Brain, Wrench, Sparkles,
    ChevronRight, Clock, FileText, CheckCircle2, History
} from 'lucide-react'

export default function Dashboard() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [recentAttempts, setRecentAttempts] = useState([])
    const [showAIGen, setShowAIGen] = useState(false)
    const [aiTopic, setAiTopic] = useState('')
    const [aiCount, setAiCount] = useState(5)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiQuestions, setAiQuestions] = useState(null)

    useEffect(() => {
        fetchRecentAttempts()
    }, [user])

    async function fetchRecentAttempts() {
        if (!user) return
        try {
            const { data, error } = await supabase
                .from('test_attempts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error
            setRecentAttempts(data || [])
        } catch (err) {
            console.error('Error fetching attempts:', err)
        }
    }

    async function handleGenerateQuestions() {
        if (!aiTopic.trim()) return
        setAiLoading(true)
        try {
            const questions = await generateQuestions(aiTopic, aiCount)
            setAiQuestions(questions)
        } catch (err) {
            console.error('Failed to generate questions:', err)
        } finally {
            setAiLoading(false)
        }
    }

    function startAITest() {
        if (!aiQuestions) return
        sessionStorage.setItem('ai_questions', JSON.stringify(aiQuestions))
        sessionStorage.setItem('ai_topic', aiTopic)
        navigate('/test/ai-generated')
    }

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

    const assessments = [
        {
            id: 'technical',
            title: 'Technical Assessment',
            subtitle: 'TotalEnergies Process Engineering',
            description: '155 MCQs covering VLE, Equipment Selection, P&ID, Process Safety, and Process Fundamentals',
            icon: Settings,
            sections: ['VLE & Phase Behavior', 'Equipment Selection', 'P&ID Interpretation', 'Process Safety', 'Process Fundamentals'],
            color: '#3b82f6',
            path: '/test/technical',
        },
        {
            id: 'aptitude',
            title: 'Swift Analysis Aptitude',
            subtitle: 'Saville Consulting',
            description: 'Timed aptitude test: Verbal (6 min), Numerical (6 min), Diagrammatic Reasoning (6 min)',
            icon: Brain,
            sections: ['Verbal Reasoning', 'Numerical Reasoning', 'Diagrammatic Reasoning'],
            color: '#8b5cf6',
            path: '/test/aptitude',
        },
        {
            id: 'saville-practice',
            title: 'Process Engineer Practice',
            subtitle: 'Saville-Style Questions',
            description: 'Flow conversions, error-checking, pump placement, affinity laws, mass balances, safety concepts',
            icon: Wrench,
            sections: ['Numerical Reasoning', 'Error Checking', 'Mechanical Reasoning', 'Technical Problems'],
            color: '#10b981',
            path: '/test/saville-practice',
        },
    ]

    return (
        <div className="dashboard">
            <header className="dashboard__header">
                <div className="flex items-center gap-2">
                    <Target className="text-blue-600" size={24} />
                    <h1 className="text-lg font-bold text-slate-800">JobHunt Nigeria</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <span className="block text-sm font-semibold text-slate-700">{displayName}</span>
                        <span className="block text-xs text-slate-500">Candidate</span>
                    </div>
                    <button
                        className="btn btn--ghost btn--sm flex items-center gap-2 text-slate-500 hover:text-red-600"
                        onClick={signOut}
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <main className="dashboard__content">
                <section className="dashboard__greeting">
                    <h2 className="text-2xl font-bold text-slate-800">Welcome back, {displayName.split(' ')[0]}</h2>
                    <p className="text-slate-500 mt-1">Select a module to continue your preparation.</p>
                </section>

                <section className="dashboard__section">
                    <div className="flex items-center gap-2 mb-4 text-slate-400 font-semibold uppercase text-xs tracking-wider">
                        <FileText size={14} />
                        <span>Assessment Modules</span>
                    </div>

                    <div className="dashboard__modules">
                        {assessments.map(a => (
                            <div
                                key={a.id}
                                className="module-card group"
                                style={{ '--card-accent': a.color }}
                                onClick={() => navigate(a.path)}
                            >
                                <div className="mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                                        <a.icon size={24} color={a.color} />
                                    </div>
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">{a.title}</h4>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">{a.subtitle}</span>
                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{a.description}</p>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {a.sections.slice(0, 3).map((s, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium border border-slate-200">
                                            {s}
                                        </span>
                                    ))}
                                    {a.sections.length > 3 && (
                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded font-medium border border-slate-200">
                                            +{a.sections.length - 3} more
                                        </span>
                                    )}
                                </div>

                                <div className="w-full flex items-center justify-between text-sm font-semibold mt-auto pt-4 border-t border-slate-100 group-hover:border-blue-100 transition-colors">
                                    <span style={{ color: a.color }}>Start Practice</span>
                                    <ChevronRight size={16} style={{ color: a.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* AI Question Generator */}
                <section className="dashboard__section">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-400 font-semibold uppercase text-xs tracking-wider">
                            <Sparkles size={14} />
                            <span>AI Question Generator</span>
                        </div>
                        <button
                            className="text-xs font-semibold text-blue-600 hover:underline"
                            onClick={() => setShowAIGen(!showAIGen)}
                        >
                            {showAIGen ? 'Hide Generator' : 'Open Generator'}
                        </button>
                    </div>

                    {showAIGen && (
                        <div className="ai-generator">
                            <div className="ai-generator__form">
                                <div className="form-group flex-1">
                                    <label className="form-label">Topic or Concept</label>
                                    <input
                                        className="form-input w-full"
                                        type="text"
                                        value={aiTopic}
                                        onChange={e => setAiTopic(e.target.value)}
                                        placeholder="e.g. Heat exchanger sizing, NPSH calculations..."
                                    />
                                </div>
                                <div className="form-group w-32">
                                    <label className="form-label">Questions</label>
                                    <select
                                        className="form-input w-full"
                                        value={aiCount}
                                        onChange={e => setAiCount(Number(e.target.value))}
                                    >
                                        <option value={5}>5 Qs</option>
                                        <option value={10}>10 Qs</option>
                                        <option value={15}>15 Qs</option>
                                        <option value={20}>20 Qs</option>
                                    </select>
                                </div>
                                <button
                                    className="btn btn--primary h-[42px] px-6"
                                    onClick={handleGenerateQuestions}
                                    disabled={aiLoading || !aiTopic.trim()}
                                >
                                    {aiLoading ? (
                                        <span className="flex items-center gap-2">Generating...</span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Sparkles size={16} /> Generate
                                        </span>
                                    )}
                                </button>
                            </div>

                            {aiQuestions && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="text-blue-600" size={20} />
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">Analysis Complete</p>
                                            <p className="text-xs text-blue-700">Generated {aiQuestions.length} questions on "{aiTopic}"</p>
                                        </div>
                                    </div>
                                    <button className="btn btn--primary btn--sm" onClick={startAITest}>
                                        Start Quiz →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Recent Attempts */}
                {recentAttempts.length > 0 && (
                    <section className="dashboard__section">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-semibold uppercase text-xs tracking-wider">
                            <History size={14} />
                            <span>Recent Activity</span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="hidden sm:grid grid-cols-5 gap-4 p-4 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <span className="col-span-2">Assessment</span>
                                <span>Score</span>
                                <span>Mode</span>
                                <span className="text-right">Date</span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {recentAttempts.map((attempt, i) => {
                                    const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
                                    const isPass = percentage >= 60

                                    return (
                                        <div key={i} className="p-4 sm:grid sm:grid-cols-5 sm:gap-4 sm:items-center hover:bg-slate-50 transition-colors">
                                            <div className="col-span-2 mb-2 sm:mb-0">
                                                <p className="text-sm font-medium text-slate-800">{attempt.module_name}</p>
                                                <p className="text-xs text-slate-500 capitalize">{attempt.assessment_type.replace('-', ' ')}</p>
                                            </div>

                                            <div className="mb-2 sm:mb-0 flex items-center gap-2">
                                                <div className={`text-sm font-bold ${isPass ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {percentage}%
                                                </div>
                                                <span className="text-xs text-slate-400">({attempt.score}/{attempt.total_questions})</span>
                                            </div>

                                            <div className="mb-2 sm:mb-0">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${attempt.mode === 'exam'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {attempt.mode === 'exam' ? 'Timed Exam' : 'Practice'}
                                                </span>
                                            </div>

                                            <div className="text-right text-xs text-slate-500">
                                                {new Date(attempt.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
