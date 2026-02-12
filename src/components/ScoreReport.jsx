import { useState, useEffect, useCallback, useRef } from 'react'
import AIExplainer from './AIExplainer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { buildQuestionResults, isInteractiveQuestionType } from '../utils/questionScoring'
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

const SAVE_TIMEOUT_MS = 6000
const SAVE_FAILSAFE_MS = 8000
const RECENT_ATTEMPT_CACHE_KEY = 'jobhunt_recent_attempt_fingerprints'
const RECENT_ATTEMPT_TTL_MS = 120000

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs)
        }),
    ])
}

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
    onBackToDashboard,
}) {
    const { user } = useAuth()
    const isMountedRef = useRef(false)
    const autoSaveTriggeredRef = useRef(false)
    const [reviewMode, setReviewMode] = useState(false)
    const [currentReview, setCurrentReview] = useState(0)
    const [saved, setSaved] = useState(false)
    const [savedLocally, setSavedLocally] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    const questionResults = buildQuestionResults(questions, answers)
    const totalQuestions = questions.length || 1
    const correctCount = questionResults.filter((result) => result.correct).length
    const score = Math.round((correctCount / totalQuestions) * 100)
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

        const payload = {
            user_id: user.id,
            assessment_type: assessmentType,
            module_name: moduleName,
            score: correctCount,
            total_questions: questions.length,
            time_taken_seconds: timeTaken,
            mode,
            answers,
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

            const { data: latestAttempt, error: latestError } = await withTimeout(
                selectQuery,
                SAVE_TIMEOUT_MS,
                'Timed out while checking latest saved result.'
            )

            if (latestError) throw latestError

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

            const { data: insertedAttempt, error } = await withTimeout(
                insertQuery,
                SAVE_TIMEOUT_MS,
                'Timed out while saving result to Supabase.'
            )

            if (error) throw error

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
                setSaveError(err?.message || 'Unable to save results right now.')
            }
            return false
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
        questions.length,
        timeTaken,
        mode,
        answers,
    ])

    useEffect(() => {
        if (!user || autoSaveTriggeredRef.current) return
        autoSaveTriggeredRef.current = true
        saveResults()
    }, [saveResults, user])

    async function handleBackToDashboard() {
        if (!saved && !savedLocally) {
            await saveResults()
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

    if (reviewMode && incorrectAnswers.length > 0) {
        const q = incorrectAnswers[currentReview]
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
                        <div className="score-review__interactive">
                            <div>
                                <h4>Your Response</h4>
                                <pre>{JSON.stringify(q.answer, null, 2)}</pre>
                            </div>
                            <div>
                                <h4>Expected Answer</h4>
                                <pre>{JSON.stringify(expectedInteractiveAnswer, null, 2)}</pre>
                            </div>
                        </div>
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
                    {correctCount}/{questions.length} correct answers
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
