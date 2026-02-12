import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { generateQuestions } from '../services/deepseek'
import {
    Target,
    LogOut,
    Brain,
    Settings,
    Calculator,
    Lightbulb,
    Sparkles,
    ArrowRight,
    Clock3,
    Layers3,
    History,
    BarChart3,
    CheckCircle2,
    UserCircle2,
    Construction,
} from 'lucide-react'

const PASS_RATIO_THRESHOLD = 0.5
const DUPLICATE_WINDOW_MS = 45000

function normalizeForComparison(value) {
    if (value === null || typeof value !== 'object') return value

    if (Array.isArray(value)) {
        return value.map((item) => normalizeForComparison(item))
    }

    return Object.keys(value)
        .sort()
        .reduce((accumulator, key) => {
            accumulator[key] = normalizeForComparison(value[key])
            return accumulator
        }, {})
}

function stableSerialize(value) {
    return JSON.stringify(normalizeForComparison(value))
}

function attemptRatio(attempt) {
    const score = Number(attempt?.score)
    const total = Number(attempt?.total_questions)
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return 0
    return score / total
}

function dedupeAttempts(attempts) {
    const deduped = []
    const latestBySignature = new Map()

    for (const attempt of attempts || []) {
        const signature = [
            attempt.user_id,
            attempt.assessment_type,
            attempt.module_name,
            attempt.score,
            attempt.total_questions,
            attempt.time_taken_seconds,
            attempt.mode,
            stableSerialize(attempt.answers || {}),
        ].join('::')

        const createdAtMs = Date.parse(attempt.created_at || '')
        const previous = latestBySignature.get(signature)

        if (!previous) {
            latestBySignature.set(signature, {
                createdAtMs: Number.isNaN(createdAtMs) ? Number.MIN_SAFE_INTEGER : createdAtMs,
            })
            deduped.push(attempt)
            continue
        }

        const currentTime = Number.isNaN(createdAtMs) ? Number.MIN_SAFE_INTEGER : createdAtMs
        const diff = Math.abs(currentTime - previous.createdAtMs)

        if (diff > DUPLICATE_WINDOW_MS) {
            latestBySignature.set(signature, { createdAtMs: currentTime })
            deduped.push(attempt)
        }
    }

    return deduped
}

export default function Dashboard() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()

    const [recentAttempts, setRecentAttempts] = useState([])
    const [showAIGen, setShowAIGen] = useState(false)
    const [aiTopic, setAiTopic] = useState('')
    const [aiCount, setAiCount] = useState(5)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiQuestions, setAiQuestions] = useState(null)
    const [aiError, setAiError] = useState('')
    const [loadingAttempts, setLoadingAttempts] = useState(false)
    const [attemptsError, setAttemptsError] = useState('')
    const [signingOut, setSigningOut] = useState(false)

    const [testsTaken, setTestsTaken] = useState(0)
    const [passRate, setPassRate] = useState(null)
    const [averageScore, setAverageScore] = useState(null)
    const [practiceSessions, setPracticeSessions] = useState(0)

    const fetchRecentAttempts = useCallback(async () => {
        if (!user) return
        setLoadingAttempts(true)
        setAttemptsError('')

        try {
            const { data, error } = await supabase
                .from('test_attempts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            const attempts = dedupeAttempts(data || [])
            const examAttempts = attempts.filter((attempt) => attempt.mode === 'exam')
            const passRateSource = examAttempts.length > 0 ? examAttempts : attempts
            const passCount = passRateSource.filter((attempt) => attemptRatio(attempt) >= PASS_RATIO_THRESHOLD).length
            const averageSource = passRateSource.length > 0 ? passRateSource : attempts
            const averagePercent = averageSource.length > 0
                ? Math.round(
                    averageSource.reduce((sum, attempt) => sum + attemptRatio(attempt), 0) / averageSource.length * 100
                )
                : null

            setRecentAttempts(attempts.slice(0, 8))
            setTestsTaken(attempts.length)
            setPracticeSessions(attempts.filter((attempt) => attempt.mode === 'practice').length)
            setPassRate(passRateSource.length > 0 ? Math.round((passCount / passRateSource.length) * 100) : null)
            setAverageScore(averagePercent)
        } catch (err) {
            console.error('Error fetching attempts:', err)
            setAttemptsError('Could not load recent activity from Supabase.')
        } finally {
            setLoadingAttempts(false)
        }
    }, [user])

    useEffect(() => {
        fetchRecentAttempts()

        function handleAttemptSaved() {
            fetchRecentAttempts()
        }

        function handleWindowFocus() {
            fetchRecentAttempts()
        }

        const intervalId = setInterval(fetchRecentAttempts, 20000)

        window.addEventListener('attempt-saved', handleAttemptSaved)
        window.addEventListener('focus', handleWindowFocus)
        return () => {
            clearInterval(intervalId)
            window.removeEventListener('attempt-saved', handleAttemptSaved)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [fetchRecentAttempts])

    async function handleGenerateQuestions() {
        if (!aiTopic.trim()) return
        setAiError('')
        setAiQuestions(null)
        setAiLoading(true)
        try {
            const questions = await generateQuestions(aiTopic, aiCount)
            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('AI returned an empty question set.')
            }
            setAiQuestions(questions)
        } catch (err) {
            console.error('Failed to generate questions:', err)
            const message = err?.message || 'Failed to generate questions.'
            setAiError(message)
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

    const displayName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        'Candidate'

    const moduleSections = [
        {
            id: 'total',
            title: 'TotalEnergies',
            description: 'Official Saville-style process engineering track.',
            modules: [
                {
                    id: 'saville-aptitude',
                    title: 'Swift Analysis Aptitude',
                    subtitle: 'Verbal, Numerical, Diagrammatic',
                    description: 'Timed section-based cognitive screening.',
                    icon: Brain,
                    stat: '18 mins',
                    type: 'Exam',
                    status: 'active',
                    path: '/test/aptitude',
                    accent: 'blue',
                },
                {
                    id: 'technical',
                    title: 'Process Technical Assessment',
                    subtitle: 'Domain + fundamentals',
                    description: '155-item bank with practice and exam modes.',
                    icon: Settings,
                    stat: '155 Qs',
                    type: 'Practice + Exam',
                    status: 'active',
                    path: '/test/technical',
                    accent: 'slate',
                },
            ],
        },
        {
            id: 'nlng',
            title: 'NLNG',
            description: 'SHL-aligned readiness for graduate trainee screening.',
            modules: [
                {
                    id: 'nlng-shl',
                    title: 'SHL Deductive Reasoning',
                    subtitle: 'Logic and inference',
                    description: 'Timed deductive module modeled after SHL format.',
                    icon: Lightbulb,
                    stat: '30 Qs',
                    type: 'Practice + Exam',
                    status: 'active',
                    path: '/test/nlng',
                    accent: 'sky',
                },
            ],
        },
        {
            id: 'drills',
            title: 'Drills',
            description: 'Focused speed and calculation training.',
            modules: [
                {
                    id: 'saville-practice',
                    title: 'Engineering Math Drills',
                    subtitle: 'Conversions, balances, quick math',
                    description: '30 process-focused drill questions with explanations.',
                    icon: Calculator,
                    stat: '30 Qs',
                    type: 'Drill',
                    status: 'active',
                    path: '/test/saville-practice',
                    accent: 'emerald',
                },
            ],
        },
        {
            id: 'dragnet',
            title: 'Dragnet',
            description: 'Planned module for additional Nigerian hiring tracks.',
            modules: [
                {
                    id: 'dragnet-coming',
                    title: 'Dragnet Assessment Track',
                    subtitle: 'Module roadmap in progress',
                    description: 'Question bank and delivery flow are currently being finalized.',
                    icon: Construction,
                    stat: 'Planned',
                    type: 'Coming Soon',
                    status: 'coming-soon',
                    accent: 'amber',
                },
            ],
        },
    ]

    function launchModule(module) {
        if (module.status !== 'active') return
        if (module.path) {
            navigate(module.path)
        }
    }

    async function handleSignOut() {
        setSigningOut(true)
        try {
            await signOut()
            navigate('/login', { replace: true })
        } catch (error) {
            console.error('Failed to sign out:', error)
        } finally {
            setSigningOut(false)
        }
    }

    return (
        <div className="platform-page">
            <header className="platform-header">
                <div className="platform-header__brand">
                    <span className="platform-header__logo">
                        <Target size={18} />
                    </span>
                    <div>
                        <h1>JobHunt Nigeria</h1>
                        <p>Graduate Assessment Platform</p>
                    </div>
                </div>

                <div className="platform-header__actions">
                    <div className="platform-user">
                        <UserCircle2 size={18} />
                        <span>{displayName}</span>
                    </div>
                    <button
                        className="btn btn--ghost platform-logout"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        aria-label="Sign out"
                    >
                        <LogOut size={16} />
                        {signingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                </div>
            </header>

            <main className="platform-shell dashboard-shell">
                <section className="dashboard-hero">
                    <div className="dashboard-hero__text">
                        <p className="dashboard-eyebrow">Assessment Command Center</p>
                        <h2>Prepare like a top candidate, not a guesser.</h2>
                        <p>
                            Run targeted practice, simulate timed pressure, and track your readiness across
                            employer-specific pathways.
                        </p>
                    </div>
                    <div className="dashboard-hero__metrics">
                        <article className="metric-card">
                            <span className="metric-card__label">Pass Rate (50%+)</span>
                            <strong className="metric-card__value">{passRate !== null ? `${passRate}%` : '--'}</strong>
                        </article>
                        <article className="metric-card">
                            <span className="metric-card__label">Tests Taken</span>
                            <strong className="metric-card__value">{testsTaken}</strong>
                        </article>
                        <article className="metric-card">
                            <span className="metric-card__label">Average Score</span>
                            <strong className="metric-card__value">{averageScore !== null ? `${averageScore}%` : '--'}</strong>
                        </article>
                        <article className="metric-card">
                            <span className="metric-card__label">Practice Sessions</span>
                            <strong className="metric-card__value">{practiceSessions}</strong>
                        </article>
                    </div>
                </section>

                <div className="dashboard-grid">
                    <section className="dashboard-main">
                        {moduleSections.map(section => (
                            <div className="module-group" key={section.id}>
                                <header className="module-group__header">
                                    <h3>{section.title}</h3>
                                    <p>{section.description}</p>
                                </header>
                                <div className="module-group__grid">
                                    {section.modules.map(module => {
                                        const isLive = module.status === 'active'
                                        return (
                                            <article
                                                key={module.id}
                                                className={`module-card module-card--${module.accent || 'blue'} ${!isLive ? 'module-card--disabled' : ''}`}
                                                aria-disabled={!isLive}
                                            >
                                                <div className="module-card__top">
                                                    <span className="module-card__icon">
                                                        <module.icon size={20} />
                                                    </span>
                                                    <span className={`module-card__status ${isLive ? 'module-card__status--live' : 'module-card__status--soon'}`}>
                                                        {isLive ? 'Live' : 'Coming Soon'}
                                                    </span>
                                                </div>

                                                <h4>{module.title}</h4>
                                                <p className="module-card__subtitle">{module.subtitle}</p>
                                                <p className="module-card__description">{module.description}</p>

                                                <div className="module-card__meta">
                                                    <span><Clock3 size={14} /> {module.stat}</span>
                                                    <span><Layers3 size={14} /> {module.type}</span>
                                                </div>

                                                <button
                                                    className={`btn btn--sm ${isLive ? 'btn--primary' : 'btn--secondary'}`}
                                                    onClick={() => launchModule(module)}
                                                    disabled={!isLive}
                                                >
                                                    {isLive ? <>Open Module <ArrowRight size={14} /></> : 'In Progress'}
                                                </button>
                                            </article>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </section>

                    <aside className="dashboard-side">
                        <section className="ai-studio">
                            <header>
                                <Sparkles size={16} />
                                <h4>AI Practice Studio</h4>
                            </header>
                            <p>Generate fresh practice questions by topic and launch an instant custom test.</p>

                            {!showAIGen ? (
                                <button
                                    className="btn btn--primary btn--full"
                                    onClick={() => setShowAIGen(true)}
                                >
                                    Start AI Generator
                                </button>
                            ) : (
                                <div className="ai-studio__form">
                                    <label htmlFor="ai-topic">Topic</label>
                                    <input
                                        id="ai-topic"
                                        className="form-input"
                                        type="text"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        placeholder="e.g. Distillation column design"
                                    />

                                    <div className="ai-studio__count">
                                        {[5, 10].map(n => (
                                            <button
                                                key={n}
                                                className={`btn btn--sm ${aiCount === n ? 'btn--primary' : 'btn--secondary'}`}
                                                onClick={() => setAiCount(n)}
                                            >
                                                {n} Questions
                                            </button>
                                        ))}
                                    </div>

                                    <div className="ai-studio__actions">
                                        <button
                                            className="btn btn--ghost"
                                            onClick={() => {
                                                setShowAIGen(false)
                                                setAiError('')
                                                setAiQuestions(null)
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn--primary"
                                            onClick={handleGenerateQuestions}
                                            disabled={!aiTopic.trim() || aiLoading}
                                        >
                                            {aiLoading ? 'Generating...' : 'Generate'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {aiError && (
                                <div className="score-report__save-error">
                                    {aiError}
                                </div>
                            )}

                            {aiQuestions && (
                                <div className="ai-studio__ready">
                                    <span><CheckCircle2 size={15} /> Quiz ready</span>
                                    <button className="btn btn--primary btn--sm" onClick={startAITest}>
                                        Launch
                                    </button>
                                </div>
                            )}
                        </section>

                        <section className="activity-panel">
                            <header>
                                <h4><History size={16} /> Recent Activity</h4>
                            </header>
                            <div className="activity-list">
                                {loadingAttempts && recentAttempts.length === 0 && (
                                    <div className="empty-state">
                                        <BarChart3 size={18} />
                                        <p>Loading your recent attempts...</p>
                                    </div>
                                )}
                                {attemptsError && (
                                    <div className="score-report__save-error">
                                        {attemptsError}
                                    </div>
                                )}
                                {recentAttempts.length === 0 && !loadingAttempts && !attemptsError && (
                                    <div className="empty-state">
                                        <BarChart3 size={18} />
                                        <p>No attempts yet. Start a module to build your stats.</p>
                                    </div>
                                )}
                                {recentAttempts.map(attempt => {
                                    const percentage = Math.round(attemptRatio(attempt) * 100)
                                    const passed = percentage >= PASS_RATIO_THRESHOLD * 100
                                    return (
                                        <article className="activity-item" key={attempt.id}>
                                            <div className="activity-item__text">
                                                <strong>{attempt.module_name || 'Practice Test'}</strong>
                                                <span>{new Date(attempt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <span className={`activity-item__score ${passed ? 'activity-item__score--pass' : 'activity-item__score--warn'}`}>
                                                {percentage}%
                                            </span>
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    )
}
