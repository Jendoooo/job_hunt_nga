import { useState, useEffect, useCallback, useRef } from 'react'
import AIExplainer from './AIExplainer'
import AISJQExplainer from './AISJQExplainer'
import { supabase, hasSupabaseEnv } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { buildQuestionResults, isInteractiveQuestionType } from '../utils/questionScoring'
import { enqueueAttemptOutbox } from '../utils/attemptOutbox'
import {
    buildSJQCompetencyBreakdownFromQuestionResults,
    resolveSJQRatingLabel,
    scoreSJQResponseUnits,
    SJQ_RESPONSE_MAX_UNITS,
} from '../utils/sjqAnalytics'
import {
    Trophy,
    Star,
    ThumbsUp,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Flag,
    XCircle,
    RotateCcw,
    ArrowLeft,
    ArrowRight,
    ClipboardList,
    Check,
} from 'lucide-react'

const SAVE_FAILSAFE_MS = 15000
const RECENT_ATTEMPT_CACHE_KEY = 'jobhunt_recent_attempt_fingerprints'
const RECENT_ATTEMPT_TTL_MS = 120000

function isAbortLikeError(error) {
    const message = typeof error?.message === 'string'
        ? error.message.toLowerCase()
        : ''
    return error?.name === 'AbortError' || message.includes('aborted')
}

function normalizeForComparison(value) {
    if (value === null || typeof value !== 'object') {
        return value
    }

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

function readRecentAttemptCache() {
    if (typeof window === 'undefined') return {}

    try {
        const raw = window.sessionStorage.getItem(RECENT_ATTEMPT_CACHE_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
        return {}
    }
}

function writeRecentAttemptCache(cache) {
    if (typeof window === 'undefined') return
    try {
        window.sessionStorage.setItem(RECENT_ATTEMPT_CACHE_KEY, JSON.stringify(cache))
    } catch {
        // Ignore storage write errors and continue with server-side duplicate checks.
    }
}

function pruneRecentAttemptCache(cache) {
    const now = Date.now()
    return Object.entries(cache).reduce((accumulator, [key, timestamp]) => {
        if (typeof timestamp === 'number' && now - timestamp <= RECENT_ATTEMPT_TTL_MS) {
            accumulator[key] = timestamp
        }
        return accumulator
    }, {})
}

function isFingerprintRecentlySaved(fingerprint) {
    const cache = pruneRecentAttemptCache(readRecentAttemptCache())
    writeRecentAttemptCache(cache)
    return Boolean(cache[fingerprint])
}

function markFingerprintAsSaved(fingerprint) {
    const cache = pruneRecentAttemptCache(readRecentAttemptCache())
    cache[fingerprint] = Date.now()
    writeRecentAttemptCache(cache)
}

function isLikelyDuplicateAttempt(latestAttempt, payload) {
    if (!latestAttempt) return false

    const latestCreatedAt = new Date(latestAttempt.created_at).getTime()
    const now = Date.now()
    const ageInSeconds = Number.isNaN(latestCreatedAt) ? Number.MAX_SAFE_INTEGER : Math.abs(now - latestCreatedAt) / 1000

    if (ageInSeconds > 30) return false

    return (
        latestAttempt.assessment_type === payload.assessment_type &&
        latestAttempt.module_name === payload.module_name &&
        latestAttempt.score === payload.score &&
        latestAttempt.total_questions === payload.total_questions &&
        latestAttempt.time_taken_seconds === payload.time_taken_seconds &&
        latestAttempt.mode === payload.mode &&
        stableSerialize(latestAttempt.answers || {}) === stableSerialize(payload.answers || {})
    )
}

function createClientAttemptId() {
    const cryptoObj = typeof crypto !== 'undefined' ? crypto : null
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID()
    }

    const bytes = new Uint8Array(16)
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
        cryptoObj.getRandomValues(bytes)
    } else {
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = Math.floor(Math.random() * 256)
        }
    }

    // UUID v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join(''),
    ].join('-')
}

export default function ScoreReport({
    questions,
    answers,
    answersForSave,
    flagged = [],
    timeTaken,
    totalTime,
    assessmentType,
    moduleName,
    mode,
    onRetry,
    onBackToDashboard,
    scoreCorrectUnits,
    scoreTotalUnits,
    scoreUnitLabel = 'correct answers',
}) {
    const { user } = useAuth()
    const isMountedRef = useRef(false)
    const autoSaveTriggeredRef = useRef(false)
    const attemptIdRef = useRef(null)
    const [reviewMode, setReviewMode] = useState(false)
    const [currentReview, setCurrentReview] = useState(0)
    const [saved, setSaved] = useState(false)
    const [savedLocally, setSavedLocally] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    const questionResults = buildQuestionResults(questions, answers)
    const answersForPersistence = answersForSave ?? answers
    const hasScoreOverrides =
        Number.isFinite(scoreCorrectUnits) &&
        Number.isFinite(scoreTotalUnits) &&
        Number(scoreTotalUnits) > 0
    const saveTotalQuestions = hasScoreOverrides ? Number(scoreTotalUnits) : questions.length
    const totalQuestions = hasScoreOverrides ? Number(scoreTotalUnits) : (questions.length || 1)
    const correctCount = hasScoreOverrides
        ? Number(scoreCorrectUnits)
        : questionResults.filter((result) => result.correct).length
    const score = Math.round((correctCount / (totalQuestions || 1)) * 100)
    const skipped = questionResults.filter((result) => !result.answered).length
    const incorrectAnswers = questionResults.filter((result) => result.answered && !result.correct)

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    const saveResults = useCallback(async () => {
        if (!user || saved || savedLocally || saving) return saved || savedLocally

        if (isMountedRef.current) {
            setSaving(true)
            setSaveError('')
        }

        if (!attemptIdRef.current) {
            attemptIdRef.current = createClientAttemptId()
        }

        const payload = {
            id: attemptIdRef.current,
            user_id: user.id,
            assessment_type: assessmentType,
            module_name: moduleName,
            score: correctCount,
            total_questions: saveTotalQuestions,
            time_taken_seconds: timeTaken,
            mode,
            answers: answersForPersistence,
        }

        if (!hasSupabaseEnv) {
            enqueueAttemptOutbox(payload)
            window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
            if (isMountedRef.current) {
                setSavedLocally(true)
                setSaveError('Supabase is not configured in this environment. Result saved locally.')
                setSaving(false)
            }
            return true
        }

        const attemptFingerprint = stableSerialize(payload)
        const controller = new AbortController()
        let failsafeTimerId = null

        async function persistToSupabase(signal) {
            if (isFingerprintRecentlySaved(attemptFingerprint)) {
                window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
                return { status: 'saved' }
            }

            let selectQuery = supabase
                .from('test_attempts')
                .select('assessment_type, module_name, score, total_questions, answers, time_taken_seconds, mode, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (signal) {
                selectQuery = selectQuery.abortSignal(signal)
            }

            // No inner timeout on the SELECT - governed by AbortController + SAVE_FAILSAFE_MS.
            // Using withTimeout here caused false "timed out" errors on Supabase cold starts.
            const { data: latestAttempt, error: latestError } = await selectQuery

            if (signal?.aborted) return { status: 'aborted' }
            if (latestError) {
                if (isAbortLikeError(latestError)) return { status: 'aborted' }
                throw latestError
            }

            if (isLikelyDuplicateAttempt(latestAttempt, payload)) {
                markFingerprintAsSaved(attemptFingerprint)
                window.dispatchEvent(new CustomEvent('attempt-saved', { detail: latestAttempt }))
                return { status: 'saved' }
            }

            let insertQuery = supabase
                .from('test_attempts')
                .insert(payload)
                .select('*')
                .single()

            if (signal) {
                insertQuery = insertQuery.abortSignal(signal)
            }

            const { data: insertedAttempt, error } = await insertQuery
            if (signal?.aborted) return { status: 'aborted' }
            if (error) {
                if (isAbortLikeError(error)) return { status: 'aborted' }
                throw error
            }

            markFingerprintAsSaved(attemptFingerprint)
            window.dispatchEvent(new CustomEvent('attempt-saved', { detail: insertedAttempt || payload }))
            return { status: 'saved' }
        }

        try {
            const savePromise = persistToSupabase(controller.signal).catch((error) => {
                if (isAbortLikeError(error) || controller.signal.aborted) {
                    return { status: 'aborted' }
                }
                throw error
            })

            const result = await Promise.race([
                savePromise,
                new Promise((resolve) => {
                    failsafeTimerId = setTimeout(() => {
                        controller.abort()
                        resolve({ status: 'local' })
                    }, SAVE_FAILSAFE_MS)
                }),
            ])

            if (result?.status === 'saved') {
                if (isMountedRef.current) {
                    setSaved(true)
                    setSavedLocally(false)
                }
                return true
            }

            if (result?.status === 'local') {
                if (isMountedRef.current) {
                    setSavedLocally(true)
                    setSaveError('')
                }
                enqueueAttemptOutbox(payload)
                window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
                return true
            }

            return false
        } catch (err) {
            if (isAbortLikeError(err) || controller.signal.aborted) {
                return false
            }

            console.error('Failed to save results:', err)
            if (isMountedRef.current) {
                const message = String(err?.message || '')
                const lowered = message.toLowerCase()
                if (lowered.includes('row level security') || lowered.includes('permission') || lowered.includes('not authorized')) {
                    setSaveError('Supabase permissions blocked saving this attempt (RLS). Result saved locally and will retry syncing.')
                } else {
                    setSaveError(message || 'Unable to save results right now.')
                }
                setSavedLocally(true)
            }
            enqueueAttemptOutbox(payload)
            window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
            return true
        } finally {
            if (failsafeTimerId) {
                clearTimeout(failsafeTimerId)
            }
            controller.abort()
            if (isMountedRef.current) {
                setSaving(false)
            }
        }
    }, [
        user,
        saved,
        savedLocally,
        saving,
        assessmentType,
        moduleName,
        correctCount,
        saveTotalQuestions,
        timeTaken,
        mode,
        answersForPersistence,
    ])

    useEffect(() => {
        if (!user || autoSaveTriggeredRef.current) return
        autoSaveTriggeredRef.current = true
        saveResults()
    }, [saveResults, user])

    function handleBackToDashboard() {
        if (!saved && !savedLocally) {
            void saveResults()
        }
        onBackToDashboard()
    }

    function getGrade() {
        if (score >= 90) return { label: 'Excellent', icon: Trophy, tone: 'excellent' }
        if (score >= 75) return { label: 'Very Good', icon: Star, tone: 'very-good' }
        if (score >= 60) return { label: 'Good', icon: ThumbsUp, tone: 'good' }
        if (score >= 50) return { label: 'Pass', icon: CheckCircle2, tone: 'pass' }
        return { label: 'Needs Work', icon: AlertTriangle, tone: 'improve' }
    }

    const grade = getGrade()
    const isSJQAssessment = assessmentType === 'nlng_sjq'
        || questionResults.some((result) => result?.subtest === 'situational_judgement')
    const sjqCompetencyBreakdown = isSJQAssessment
        ? buildSJQCompetencyBreakdownFromQuestionResults(questionResults)
        : null

    function resolveChoiceLabel(id, options) {
        if (!id) return '--'
        const match = (options || []).find((option) => String(option?.id) === String(id))
        return match?.label || String(id)
    }

    function formatSJQUnits(value) {
        const num = Number(value)
        if (!Number.isFinite(num)) return '0'
        const fixed = num.toFixed(1)
        return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
    }

    function renderSJQReview(questionResult) {
        const responses = Array.isArray(questionResult?.responses) ? questionResult.responses : []
        const expectedMap = questionResult?.correct_answer || {}
        const actualMap = questionResult?.answer && typeof questionResult.answer === 'object' ? questionResult.answer : {}

        return (
            <div className="score-review__interactive">
                <table className="score-review__interactive-table">
                    <thead>
                        <tr>
                            <th>Response</th>
                            <th>Your Choice</th>
                            <th>Expected</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {responses.map((r) => {
                            const your = resolveSJQRatingLabel(actualMap?.[r.id])
                            const exp = resolveSJQRatingLabel(expectedMap?.[r.id])
                            const units = scoreSJQResponseUnits(expectedMap?.[r.id], actualMap?.[r.id])
                            const rowTone = units === SJQ_RESPONSE_MAX_UNITS
                                ? 'score-review__interactive-row--ok'
                                : units >= Math.ceil(SJQ_RESPONSE_MAX_UNITS * 0.6)
                                    ? 'score-review__interactive-row--mid'
                                    : 'score-review__interactive-row--bad'
                            return (
                                <tr
                                    key={r.id}
                                    className={rowTone}
                                >
                                    <td>
                                        <strong className="mr-2">{String(r.id).toUpperCase()}.</strong>
                                        {r.text}
                                    </td>
                                    <td>{your}</td>
                                    <td>{exp}</td>
                                    <td>{units}/{SJQ_RESPONSE_MAX_UNITS}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    function renderInteractiveReview(questionResult, expectedAnswer) {
        const actualAnswer = questionResult?.answer
        const widgetData = questionResult?.widget_data || {}

        if (questionResult.type === 'interactive_drag_table') {
            const rows = Array.isArray(widgetData.rows) ? widgetData.rows : []
            const draggables = Array.isArray(widgetData.draggables) ? widgetData.draggables : []
            const labelById = draggables.reduce((acc, item) => {
                acc[String(item.id)] = item.label
                return acc
            }, {})
            const expectedMap = expectedAnswer && typeof expectedAnswer === 'object' ? expectedAnswer : {}
            const actualMap = actualAnswer && typeof actualAnswer === 'object' ? actualAnswer : {}

            return (
                <div className="score-review__interactive">
                    <table className="score-review__interactive-table">
                        <thead>
                            <tr>
                                <th>Row</th>
                                <th>Your Answer</th>
                                <th>Expected</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const rowId = row?.id
                                const rowLabel = row?.label || row?.values?.[0] || rowId
                                const your = labelById[String(actualMap?.[rowId])] || actualMap?.[rowId] || '--'
                                const expected = labelById[String(expectedMap?.[rowId])] || expectedMap?.[rowId] || '--'
                                const ok = String(actualMap?.[rowId] || '') === String(expectedMap?.[rowId] || '')
                                return (
                                    <tr key={rowId} className={ok ? 'score-review__interactive-row--ok' : ''}>
                                        <td>{rowLabel}</td>
                                        <td>{your}</td>
                                        <td>{expected}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }

        if (questionResult.type === 'interactive_pie_chart') {
            const segments = Array.isArray(widgetData.segments) ? widgetData.segments : []
            const expectedMap = expectedAnswer && typeof expectedAnswer === 'object' ? expectedAnswer : {}
            const actualMap = actualAnswer && typeof actualAnswer === 'object' ? actualAnswer : {}
            const totalValue = Number(widgetData.total_value) || 0
            const tolerance = questionResult?.tolerance?.pct ?? 2

            return (
                <div className="score-review__interactive">
                    <table className="score-review__interactive-table">
                        <thead>
                            <tr>
                                <th>Segment</th>
                                <th>Your %</th>
                                <th>Expected %</th>
                                <th>Your Value</th>
                                <th>Expected Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {segments.map((segment) => {
                                const id = segment?.id
                                const label = segment?.label || id
                                const yourPct = Number(actualMap?.[id])
                                const expPct = Number(expectedMap?.[id])
                                const ok = Number.isFinite(yourPct) && Number.isFinite(expPct)
                                    ? Math.abs(yourPct - expPct) <= tolerance
                                    : false
                                const yourValue = Number.isFinite(yourPct) ? Math.round(totalValue * (yourPct / 100)) : null
                                const expValue = Number.isFinite(expPct) ? Math.round(totalValue * (expPct / 100)) : null
                                return (
                                    <tr key={id} className={ok ? 'score-review__interactive-row--ok' : ''}>
                                        <td>{label}</td>
                                        <td>{Number.isFinite(yourPct) ? `${Math.round(yourPct)}%` : '--'}</td>
                                        <td>{Number.isFinite(expPct) ? `${Math.round(expPct)}%` : '--'}</td>
                                        <td>{yourValue ?? '--'}</td>
                                        <td>{expValue ?? '--'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }

        if (questionResult.type === 'interactive_stacked_bar') {
            const bars = Array.isArray(widgetData.interactive_bars) ? widgetData.interactive_bars : []
            const expected = expectedAnswer || {}
            const actual = actualAnswer || {}
            const totalTolerance = questionResult?.tolerance?.total ?? 0
            const splitTolerance = questionResult?.tolerance?.split_pct ?? 0
            const primaryLabel = widgetData?.segment_labels?.primary || widgetData?.labels?.bottom || 'Primary'

            const rows = bars.length > 0
                ? bars.map((bar) => ({ id: bar.id, label: bar.label || bar.id }))
                : Object.keys(expected || {}).map((key) => ({ id: key, label: key }))

            return (
                <div className="score-review__interactive">
                    <table className="score-review__interactive-table">
                        <thead>
                            <tr>
                                <th>Bar</th>
                                <th>Your Total</th>
                                <th>Expected Total</th>
                                <th>Your {primaryLabel}%</th>
                                <th>Expected {primaryLabel}%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const expBar = expected?.[row.id]
                                const actBar = actual?.[row.id]
                                const expTotal = Number(expBar?.total)
                                const actTotal = Number(actBar?.total)
                                const expSplit = Number(expBar?.split_pct)
                                const actSplit = Number(actBar?.split_pct)
                                const ok = Number.isFinite(expTotal) && Number.isFinite(actTotal) && Number.isFinite(expSplit) && Number.isFinite(actSplit)
                                    ? (Math.abs(expTotal - actTotal) <= totalTolerance && Math.abs(expSplit - actSplit) <= splitTolerance)
                                    : false

                                return (
                                    <tr key={row.id} className={ok ? 'score-review__interactive-row--ok' : ''}>
                                        <td>{row.label}</td>
                                        <td>{Number.isFinite(actTotal) ? Math.round(actTotal) : '--'}</td>
                                        <td>{Number.isFinite(expTotal) ? Math.round(expTotal) : '--'}</td>
                                        <td>{Number.isFinite(actSplit) ? `${Math.round(actSplit)}%` : '--'}</td>
                                        <td>{Number.isFinite(expSplit) ? `${Math.round(expSplit)}%` : '--'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }

        if (questionResult.type === 'interactive_tabbed_evaluation') {
            const tabs = Array.isArray(widgetData.tabs) ? widgetData.tabs : []
            const options = Array.isArray(widgetData.options) ? widgetData.options : []
            const expectedMap = expectedAnswer && typeof expectedAnswer === 'object' ? expectedAnswer : {}
            const actualMap = actualAnswer && typeof actualAnswer === 'object' ? actualAnswer : {}
            const tabRows = tabs.length > 0
                ? tabs.map((tab) => ({ id: tab.id, label: tab.label || tab.id }))
                : Object.keys(expectedMap).map((id) => ({ id, label: id }))

            return (
                <div className="score-review__interactive">
                    <table className="score-review__interactive-table">
                        <thead>
                            <tr>
                                <th>Tab</th>
                                <th>Your Status</th>
                                <th>Expected</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tabRows.map((tab) => {
                                const your = resolveChoiceLabel(actualMap?.[tab.id], options)
                                const exp = resolveChoiceLabel(expectedMap?.[tab.id], options)
                                const ok = String(actualMap?.[tab.id] || '') === String(expectedMap?.[tab.id] || '')
                                return (
                                    <tr key={tab.id} className={ok ? 'score-review__interactive-row--ok' : ''}>
                                        <td>{tab.label}</td>
                                        <td>{your}</td>
                                        <td>{exp}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }

        if (questionResult.type === 'interactive_point_graph') {
            const labels = Array.isArray(widgetData.x_axis_labels) ? widgetData.x_axis_labels : []
            const expectedValues = expectedAnswer && typeof expectedAnswer === 'object' && Array.isArray(expectedAnswer.values)
                ? expectedAnswer.values
                : (Array.isArray(expectedAnswer) ? expectedAnswer : [])
            const actualValues = actualAnswer && typeof actualAnswer === 'object' && Array.isArray(actualAnswer.values)
                ? actualAnswer.values
                : (Array.isArray(actualAnswer) ? actualAnswer : [])
            const tolerance = questionResult?.tolerance?.value ?? 1

            return (
                <div className="score-review__interactive">
                    <table className="score-review__interactive-table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Your Value</th>
                                <th>Expected</th>
                            </tr>
                        </thead>
                        <tbody>
                            {labels.map((label, index) => {
                                const act = Number(actualValues[index])
                                const exp = Number(expectedValues[index])
                                const ok = Number.isFinite(act) && Number.isFinite(exp)
                                    ? Math.abs(act - exp) <= tolerance
                                    : false
                                return (
                                    <tr key={label} className={ok ? 'score-review__interactive-row--ok' : ''}>
                                        <td>{label}</td>
                                        <td>{Number.isFinite(act) ? act.toLocaleString() : '--'}</td>
                                        <td>{Number.isFinite(exp) ? exp.toLocaleString() : '--'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }

        return (
            <div className="score-review__interactive">
                <pre>{JSON.stringify(actualAnswer, null, 2)}</pre>
            </div>
        )
    }

    if (reviewMode && incorrectAnswers.length > 0) {
        const q = incorrectAnswers[currentReview]
        const isSJQ = q.subtest === 'situational_judgement'
        const interactiveReview = isInteractiveQuestionType(q.type)
        const expectedInteractiveAnswer = q.correct_answer || q.correctAnswer
        return (
            <div className="score-review">
                <header className="score-review__top">
                    <button className="btn btn--ghost" onClick={() => setReviewMode(false)}>
                        <ArrowLeft size={15} />
                        Back To Results
                    </button>
                    <span>Reviewing {currentReview + 1} of {incorrectAnswers.length}</span>
                </header>

                <article className="score-review__card">
                    <p className="score-review__question-tag">Question {q.index + 1}</p>
                    {isSJQ ? (
                        <>
                            <h3>{q.scenario}</h3>
                            <p className="score-review__sjq-prompt">{q.question}</p>
                            {renderSJQReview(q)}
                        </>
                    ) : (
                        <>
                            <h3>{q.question}</h3>
                            {Array.isArray(q.options) && typeof q.correctAnswer === 'number' ? (
                                <div className="score-review__options">
                                    {q.options.map((option, oi) => (
                                        <div
                                            key={oi}
                                            className={`score-review__option ${oi === q.correctAnswer
                                                ? 'score-review__option--correct'
                                                : q.answer === oi
                                                    ? 'score-review__option--wrong'
                                                    : ''}`}
                                        >
                                            <span>{String.fromCharCode(65 + oi)}</span>
                                            <p>{option}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                renderInteractiveReview(q, expectedInteractiveAnswer)
                            )}
                        </>
                    )}

                    {q.explanation && (
                        <div className="score-review__explanation">
                            <h4>Explanation</h4>
                            <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                        </div>
                    )}

                    {!interactiveReview && Array.isArray(q.options) && typeof q.correctAnswer === 'number' && (
                        <AIExplainer question={q} />
                    )}

                    {isSJQ && (
                        <AISJQExplainer question={q} answer={q.answer} />
                    )}
                </article>

                <footer className="score-review__actions">
                    <button
                        className="btn btn--secondary"
                        onClick={() => setCurrentReview(Math.max(0, currentReview - 1))}
                        disabled={currentReview === 0}
                    >
                        <ArrowLeft size={15} />
                        Previous
                    </button>
                    <button
                        className="btn btn--secondary"
                        onClick={() => setCurrentReview(Math.min(incorrectAnswers.length - 1, currentReview + 1))}
                        disabled={currentReview === incorrectAnswers.length - 1}
                    >
                        Next
                        <ArrowRight size={15} />
                    </button>
                </footer>
            </div>
        )
    }

    return (
        <section className="score-report">
            <article className={`score-report__hero score-report__hero--${grade.tone}`}>
                <div className="score-report__grade-icon">
                    <grade.icon size={30} />
                </div>
                <h2>{grade.label}</h2>
                <p className="score-report__score">{score}%</p>
                <p className="score-report__score-sub">
                    {correctCount}/{saveTotalQuestions} {scoreUnitLabel}
                </p>
            </article>

            <div className="score-report__stats">
                <article>
                    <Clock size={16} />
                    <span>{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</span>
                    <p>Time Taken</p>
                </article>
                <article>
                    <Clock size={16} />
                    <span>{Math.floor(totalTime / 60)}m</span>
                    <p>Time Allowed</p>
                </article>
                <article>
                    <XCircle size={16} />
                    <span>{skipped}</span>
                    <p>Skipped</p>
                </article>
                <article>
                    <Flag size={16} />
                    <span>{flagged.length}</span>
                    <p>Flagged</p>
                </article>
            </div>

            {sjqCompetencyBreakdown && (
                <article className="score-report__breakdown">
                    <header className="score-report__breakdown-head">
                        <h3>Competency Breakdown</h3>
                        <p>Alignment by NLNG value category (based on your ratings).</p>
                    </header>

                    <div className="score-report__breakdown-grid">
                        {sjqCompetencyBreakdown.map((item) => {
                            const tone = item.pct >= 80 ? 'good' : item.pct >= 60 ? 'mid' : 'bad'
                            const showTip = item.total > 0 && item.pct < 70

                            return (
                                <div key={item.id} className="score-report__breakdown-card">
                                    <div className="score-report__breakdown-top">
                                        <div className="score-report__breakdown-label">{item.label}</div>
                                        <div className="score-report__breakdown-value">
                                            {item.pct}%
                                            <span className="score-report__breakdown-sub">
                                                {formatSJQUnits(item.earned)}/{formatSJQUnits(item.total)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="score-report__breakdown-bar" aria-hidden="true">
                                        <span
                                            className={`score-report__breakdown-fill score-report__breakdown-fill--${tone}`}
                                            style={{ width: `${Math.max(0, Math.min(100, item.pct))}%` }}
                                        />
                                    </div>

                                    {showTip && (
                                        <p className="score-report__breakdown-tip">{item.tip}</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </article>
            )}

            {saved && (
                <div className="score-report__saved">
                    <Check size={14} />
                    Results saved to your profile
                </div>
            )}

            {savedLocally && !saved && (
                <div className="score-report__saved score-report__saved--local">
                    <Check size={14} />
                    Result saved locally. Cloud sync is pending.
                </div>
            )}

            {saving && (
                <div className="score-report__saving">
                    Saving your result...
                </div>
            )}

            {saveError && (
                <div className="score-report__save-error">
                    Could not save result yet: {saveError}
                </div>
            )}

            <div className="score-report__actions">
                {incorrectAnswers.length > 0 && (
                    <button className="btn btn--primary" onClick={() => setReviewMode(true)}>
                        <ClipboardList size={16} />
                        Review Incorrect
                    </button>
                )}
                <button className="btn btn--secondary" onClick={onRetry}>
                    <RotateCcw size={16} />
                    Retry
                </button>
                <button className="btn btn--ghost" onClick={handleBackToDashboard}>
                    <ArrowLeft size={16} />
                    Dashboard
                </button>
            </div>
        </section>
    )
}
