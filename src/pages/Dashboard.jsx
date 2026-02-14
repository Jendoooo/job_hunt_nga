import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase, hasSupabaseEnv } from '../lib/supabase'
import { insertTestAttempt } from '../lib/supabaseWrites'
import { generateQuestions } from '../services/deepseek'
import { readAttemptOutbox, removeAttemptOutbox } from '../utils/attemptOutbox'
import sjqQuestions from '../data/nlng-sjq-questions.json'
import { buildSJQRollingProfileFromAttempts } from '../utils/sjqAnalytics'
import {
    Target,
    LogOut,
    Brain,
    Cpu,
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
const NON_GRADED_ASSESSMENT_TYPES = new Set([
    'nlng-opq',
])

function isAbortLikeError(error) {
    const message = typeof error?.message === 'string'
        ? error.message.toLowerCase()
        : ''
    return error?.name === 'AbortError' || message.includes('aborted')
}

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

function buildPendingAttemptsFromOutbox(userId) {
    if (!userId) return []

    const pending = readAttemptOutbox().filter((item) => item?.payload?.user_id === userId)
    return pending
        .map((item) => {
            const payload = item?.payload
            if (!payload || typeof payload !== 'object') return null

            const createdAt = payload.created_at
                ? String(payload.created_at)
                : (typeof item?.queued_at === 'number' ? new Date(item.queued_at).toISOString() : null)

            return {
                ...payload,
                created_at: createdAt || payload.created_at,
                pending_sync: true,
            }
        })
        .filter(Boolean)
}

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs)
        }),
    ])
}

function attemptRatio(attempt) {
    const assessmentType = String(attempt?.assessment_type || '')
    if (NON_GRADED_ASSESSMENT_TYPES.has(assessmentType)) return null

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
    const flushInFlightRef = useRef(false)

    const [recentAttempts, setRecentAttempts] = useState([])
    const [showAllAttempts, setShowAllAttempts] = useState(false)
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
    const [pendingSyncCount, setPendingSyncCount] = useState(0)
    const [outboxSyncError, setOutboxSyncError] = useState('')
    const [sjqRollingProfile, setSjqRollingProfile] = useState(null)
    const [moduleProgress, setModuleProgress] = useState({})

    const flushAttemptOutbox = useCallback(async (signal) => {
        if (!user) return
        if (!hasSupabaseEnv) return
        if (flushInFlightRef.current) return

        flushInFlightRef.current = true
        setOutboxSyncError('')
        try {
            const pending = readAttemptOutbox().filter((item) => item?.payload?.user_id === user.id)
            if (pending.length === 0) {
                setPendingSyncCount(0)
                return
            }

            setPendingSyncCount(pending.length)

            for (const item of pending) {
                if (signal?.aborted) return
                const payload = item?.payload
                const attemptId = payload?.id
                if (!attemptId) {
                    removeAttemptOutbox(item?.id)
                    continue
                }

                try {
                    const scorePct = payload.score_pct ?? (
                        payload.total_questions > 0
                            ? Math.round((payload.score / payload.total_questions) * 100)
                            : 0
                    )

                    await insertTestAttempt(
                        {
                            ...payload,
                            module_name: payload.module_name || '',
                            score_pct: scorePct,
                        },
                        // Outbox sync should be more patient than the report page.
                        { signal, timeoutMs: 45000 }
                    )

                    removeAttemptOutbox(attemptId)
                    window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
                } catch (error) {
                    if (isAbortLikeError(error) || signal?.aborted) return
                    console.warn('Outbox sync failed (will retry):', error)
                    setOutboxSyncError('Some locally saved results could not be synced yet. We will retry automatically.')
                }
            }

            const remaining = readAttemptOutbox().filter((item) => item?.payload?.user_id === user.id)
            setPendingSyncCount(remaining.length)
        } finally {
            flushInFlightRef.current = false
        }
    }, [user])

    const fetchRecentAttempts = useCallback(async (signal) => {
        if (!user) return
        setLoadingAttempts(true)
        setAttemptsError('')

        if (!hasSupabaseEnv) {
            const pendingAttempts = buildPendingAttemptsFromOutbox(user.id)
            const merged = dedupeAttempts(
                [...pendingAttempts].sort((left, right) => {
                    const a = Date.parse(left?.created_at || '') || 0
                    const b = Date.parse(right?.created_at || '') || 0
                    return b - a
                })
            )

            const examAttempts = merged.filter((attempt) => attempt.mode === 'exam')
            const passRateSource = examAttempts.length > 0 ? examAttempts : merged
            const gradedForKpi = passRateSource
                .map((attempt) => ({ attempt, ratio: attemptRatio(attempt) }))
                .filter((item) => item.ratio !== null)
            const passCount = gradedForKpi.filter((item) => item.ratio >= PASS_RATIO_THRESHOLD).length
            const averagePercent = gradedForKpi.length > 0
                ? Math.round(
                    gradedForKpi.reduce((sum, item) => sum + item.ratio, 0) / gradedForKpi.length * 100
                )
                : null

            const sjqBank = Array.isArray(sjqQuestions) ? sjqQuestions : []
            const sjqBankById = new Map(sjqBank.map((q) => [q.id, q]))
            const sjqProfile = buildSJQRollingProfileFromAttempts(merged, sjqBankById, { maxAttempts: 10 })

            setPendingSyncCount(pendingAttempts.length)
            setRecentAttempts(merged)
            setTestsTaken(merged.length)
            setPracticeSessions(merged.filter((attempt) => attempt.mode === 'practice').length)
            setPassRate(gradedForKpi.length > 0 ? Math.round((passCount / gradedForKpi.length) * 100) : null)
            setAverageScore(averagePercent)
            setSjqRollingProfile(sjqProfile)

            setAttemptsError('Supabase is not configured in this environment. Showing locally saved attempts only.')
            setLoadingAttempts(false)
            return
        }

        try {
            let attemptsQuery = supabase
                .from('test_attempts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100)

            let progressQuery = supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', user.id)

            if (signal) {
                attemptsQuery = attemptsQuery.abortSignal(signal)
                progressQuery = progressQuery.abortSignal(signal)
            }

            console.log('[dash] fetching attempts + progress for', user.id)

            const [attemptsResult, progressResult] = await Promise.all([
                withTimeout(attemptsQuery, 20000, 'Stats fetch timed out after 20s'),
                progressQuery.then((res) => res).catch(() => ({ data: null, error: null })),
            ])

            const { data, error } = attemptsResult
            console.log('[dash] attempts result:', { count: data?.length, error: error?.message || null })
            if (error) throw error

            // Build module progress map from user_progress table
            const progressRows = Array.isArray(progressResult?.data) ? progressResult.data : []
            console.log('[dash] progress rows:', progressRows.length)
            const progressMap = {}
            for (const row of progressRows) {
                progressMap[row.assessment_type] = {
                    attempts: row.attempts_count,
                    bestPct: row.best_score_pct,
                    latestPct: row.latest_score_pct,
                    lastAt: row.last_attempt_at,
                }
            }
            setModuleProgress(progressMap)

            const remoteAttempts = Array.isArray(data) ? data : []
            const pendingAttempts = buildPendingAttemptsFromOutbox(user.id)
            setPendingSyncCount(pendingAttempts.length)

            const remoteIds = new Set(remoteAttempts.map((attempt) => attempt?.id).filter(Boolean))
            const merged = [
                ...remoteAttempts,
                ...pendingAttempts.filter((attempt) => attempt?.id && !remoteIds.has(attempt.id)),
            ]

            merged.sort((left, right) => {
                const a = Date.parse(left?.created_at || '') || 0
                const b = Date.parse(right?.created_at || '') || 0
                return b - a
            })

            const attempts = dedupeAttempts(merged)
            const examAttempts = attempts.filter((attempt) => attempt.mode === 'exam')
            const passRateSource = examAttempts.length > 0 ? examAttempts : attempts
            const gradedForKpi = passRateSource
                .map((attempt) => ({ attempt, ratio: attemptRatio(attempt) }))
                .filter((item) => item.ratio !== null)
            const passCount = gradedForKpi.filter((item) => item.ratio >= PASS_RATIO_THRESHOLD).length
            const averagePercent = gradedForKpi.length > 0
                ? Math.round(
                    gradedForKpi.reduce((sum, item) => sum + item.ratio, 0) / gradedForKpi.length * 100
                )
                : null

            const sjqBank = Array.isArray(sjqQuestions) ? sjqQuestions : []
            const sjqBankById = new Map(sjqBank.map((q) => [q.id, q]))
            const sjqProfile = buildSJQRollingProfileFromAttempts(attempts, sjqBankById, { maxAttempts: 10 })

            setRecentAttempts(attempts)
            setTestsTaken(attempts.length)
            setPracticeSessions(attempts.filter((attempt) => attempt.mode === 'practice').length)
            setPassRate(gradedForKpi.length > 0 ? Math.round((passCount / gradedForKpi.length) * 100) : null)
            setAverageScore(averagePercent)
            setSjqRollingProfile(sjqProfile)
        } catch (err) {
            if (isAbortLikeError(err) || signal?.aborted) {
                return
            }

            // Fallback: even if Supabase is slow/unreachable, keep showing locally saved attempts.
            console.warn('[dash] fetch error:', err?.message || err)
            const pendingAttempts = buildPendingAttemptsFromOutbox(user.id)
            if (pendingAttempts.length > 0) {
                const merged = dedupeAttempts(
                    [...pendingAttempts].sort((left, right) => {
                        const a = Date.parse(left?.created_at || '') || 0
                        const b = Date.parse(right?.created_at || '') || 0
                        return b - a
                    })
                )

                const examAttempts = merged.filter((attempt) => attempt.mode === 'exam')
                const passRateSource = examAttempts.length > 0 ? examAttempts : merged
                const gradedForKpi = passRateSource
                    .map((attempt) => ({ attempt, ratio: attemptRatio(attempt) }))
                    .filter((item) => item.ratio !== null)
                const passCount = gradedForKpi.filter((item) => item.ratio >= PASS_RATIO_THRESHOLD).length
                const averagePercent = gradedForKpi.length > 0
                    ? Math.round(
                        gradedForKpi.reduce((sum, item) => sum + item.ratio, 0) / gradedForKpi.length * 100
                    )
                    : null

                const sjqBank = Array.isArray(sjqQuestions) ? sjqQuestions : []
                const sjqBankById = new Map(sjqBank.map((q) => [q.id, q]))
                const sjqProfile = buildSJQRollingProfileFromAttempts(merged, sjqBankById, { maxAttempts: 10 })

                setPendingSyncCount(pendingAttempts.length)
                setRecentAttempts(merged)
                setTestsTaken(merged.length)
                setPracticeSessions(merged.filter((attempt) => attempt.mode === 'practice').length)
                setPassRate(gradedForKpi.length > 0 ? Math.round((passCount / gradedForKpi.length) * 100) : null)
                setAverageScore(averagePercent)
                setSjqRollingProfile(sjqProfile)
            }

            if (err?.message?.includes('timed out')) {
                setAttemptsError('Supabase is taking too long to respond. Please wait a moment and refresh.')
                return
            }
            console.error('Error fetching attempts:', err)
            setAttemptsError('Could not load recent activity from Supabase.')
        } finally {
            if (!signal?.aborted) {
                setLoadingAttempts(false)
            }
        }
    }, [user])

    useEffect(() => {
        let fetchController = null
        const flushController = new AbortController()

        function runFetch() {
            if (!user) return
            if (fetchController) {
                fetchController.abort()
            }
            fetchController = new AbortController()
            flushAttemptOutbox(flushController.signal)
            fetchRecentAttempts(fetchController.signal)
        }

        runFetch()

        function handleAttemptSaved() {
            setTimeout(runFetch, 400)
        }

        function handleWindowFocus() {
            runFetch()
        }

        const intervalId = setInterval(runFetch, 30000)

        window.addEventListener('attempt-saved', handleAttemptSaved)
        window.addEventListener('focus', handleWindowFocus)
        return () => {
            if (fetchController) fetchController.abort()
            flushController.abort()
            clearInterval(intervalId)
            window.removeEventListener('attempt-saved', handleAttemptSaved)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [fetchRecentAttempts, flushAttemptOutbox, user])

    const handleManualSync = useCallback(async () => {
        if (!user) return
        const controller = new AbortController()
        await flushAttemptOutbox(controller.signal)
        await fetchRecentAttempts(controller.signal)
        controller.abort()
    }, [fetchRecentAttempts, flushAttemptOutbox, user])

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

    // Map module card id -> assessment_type used in DB
    const moduleAssessmentMap = {
        'saville-aptitude': 'saville-aptitude',
        'technical': 'totalenergies-technical',
        'nlng-shl': 'nlng-shl',
        'nlng-interactive': 'nlng-interactive-numerical',
        'nlng-sjq': 'nlng_sjq',
        'nlng-behavioral': 'nlng-opq',
        'saville-practice': 'saville-practice',
    }

    function getModuleProgressInfo(moduleId) {
        const assessmentType = moduleAssessmentMap[moduleId]
        if (!assessmentType) return null
        return moduleProgress[assessmentType] || null
    }

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
                {
                    id: 'nlng-interactive',
                    title: 'SHL Interactive Numerical',
                    subtitle: 'Table, Pie, Stacked Bar',
                    description: 'Hands-on data interpretation with draggable and adjustable widgets.',
                    icon: BarChart3,
                    stat: '50 Qs',
                    type: 'Practice + Exam',
                    status: 'active',
                    path: '/test/nlng-interactive',
                    accent: 'sky',
                },
                {
                    id: 'nlng-sjq',
                    title: 'SHL Job-Focused Assessment',
                    subtitle: 'Situational Judgement',
                    description: 'Timed SJQ: rate the effectiveness of workplace responses.',
                    icon: Brain,
                    stat: '10 Qs',
                    type: 'Timed 20 min',
                    status: 'active',
                    path: '/test/nlng-sjq',
                    accent: 'sky',
                },
                {
                    id: 'nlng-behavioral',
                    title: 'SHL Behavioral (OPQ Style)',
                    subtitle: 'Forced-choice ranking',
                    description: 'Ipsative blocks: choose most like you, then best of remaining to reveal priorities.',
                    icon: Brain,
                    stat: '32 blocks',
                    type: 'Profile',
                    status: 'active',
                    path: '/test/nlng-behavioral',
                    accent: 'sky',
                },
                {
                    id: 'nlng-process-monitor',
                    title: 'SHL Process Monitoring',
                    subtitle: 'Verify Interactive',
                    description: '5-min simulation: monitor the control panel and respond to alerts within 5 seconds.',
                    icon: Cpu,
                    stat: '5 min',
                    type: 'Simulation',
                    status: 'active',
                    path: '/test/nlng-process-monitor',
                    accent: 'red',
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
        } catch (error) {
            console.error('Failed to sign out:', error)
        } finally {
            setSigningOut(false)
            navigate('/login', { replace: true })
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

                {pendingSyncCount > 0 && (
                    <div className="dashboard-sync-banner">
                        <CheckCircle2 size={16} />
                        <span>
                            {pendingSyncCount} result{pendingSyncCount === 1 ? '' : 's'} saved locally. Cloud sync will retry automatically.
                        </span>
                        <button
                            className="btn btn--secondary btn--sm"
                            onClick={handleManualSync}
                            disabled={loadingAttempts}
                            style={{ marginLeft: 'auto' }}
                        >
                            Sync now
                        </button>
                    </div>
                )}

                {outboxSyncError && (
                    <div className="score-report__save-error" style={{ marginTop: '0.75rem' }}>
                        {outboxSyncError}
                    </div>
                )}

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
                                        const prog = getModuleProgressInfo(module.id)
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

                                                {prog && (
                                                    <div className="module-card__progress">
                                                        <div className="module-card__progress-bar" aria-hidden="true">
                                                            <span
                                                                className="module-card__progress-fill"
                                                                style={{ width: `${Math.max(0, Math.min(100, prog.bestPct))}%` }}
                                                            />
                                                        </div>
                                                        <span className="module-card__progress-label">
                                                            Best: {prog.bestPct}% &middot; {prog.attempts} attempt{prog.attempts === 1 ? '' : 's'}
                                                        </span>
                                                    </div>
                                                )}

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

                        {sjqRollingProfile?.attemptsUsed > 0 && (
                            <section className="score-report__breakdown sjq-profile-panel">
                                <header className="score-report__breakdown-head">
                                    <h3>SJQ Behavioral Profile</h3>
                                    <p>
                                        Rolling average across last {sjqRollingProfile.attemptsUsed} attempt{sjqRollingProfile.attemptsUsed === 1 ? '' : 's'}.
                                    </p>
                                </header>

                                <div className="score-report__breakdown-grid">
                                    {sjqRollingProfile.breakdown.map((item) => {
                                        if (item.total <= 0) return null
                                        const tone = item.pct >= 80 ? 'good' : item.pct >= 60 ? 'mid' : 'bad'
                                        return (
                                            <div key={item.id} className="score-report__breakdown-card">
                                                <div className="score-report__breakdown-top">
                                                    <div className="score-report__breakdown-label">{item.label}</div>
                                                    <div className="score-report__breakdown-value">
                                                        {item.pct}%
                                                    </div>
                                                </div>
                                                <div className="score-report__breakdown-bar" aria-hidden="true">
                                                    <span
                                                        className={`score-report__breakdown-fill score-report__breakdown-fill--${tone}`}
                                                        style={{ width: `${Math.max(0, Math.min(100, item.pct))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        <section className="activity-panel">
                            <header>
                                <h4><History size={16} /> Attempt History</h4>
                                {recentAttempts.length > 8 && (
                                    <button
                                        className="btn btn--ghost"
                                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
                                        onClick={() => setShowAllAttempts((prev) => !prev)}
                                    >
                                        {showAllAttempts ? 'Show less' : `View all (${recentAttempts.length})`}
                                    </button>
                                )}
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
                                {(showAllAttempts ? recentAttempts : recentAttempts.slice(0, 8)).map(attempt => {
                                    const ratio = attemptRatio(attempt)
                                    const percentage = ratio === null ? null : Math.round(ratio * 100)
                                    const passed = percentage !== null && percentage >= PASS_RATIO_THRESHOLD * 100
                                    const scoreTone = percentage === null
                                        ? 'neutral'
                                        : (passed ? 'pass' : 'warn')
                                    const modeLabel = attempt.mode === 'exam' ? 'Exam' : attempt.mode === 'practice' ? 'Practice' : null
                                    return (
                                        <article className="activity-item" key={attempt.id}>
                                            <div className="activity-item__text">
                                                <strong>{attempt.module_name || 'Practice Test'}</strong>
                                                <span>
                                                    {modeLabel && <span className={`activity-item__mode-badge activity-item__mode-badge--${attempt.mode}`}>{modeLabel}</span>}
                                                    {attempt.pending_sync && <span className="activity-item__mode-badge">Pending</span>}
                                                    {' '}{attempt.score}/{attempt.total_questions}{' Â· '}
                                                    {new Date(attempt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className={`activity-item__score activity-item__score--${scoreTone}`}>
                                                {percentage === null ? 'Profile' : `${percentage}%`}
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
