import { useState, useEffect, useCallback } from 'react'
import AIExplainer from './AIExplainer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
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
    const [reviewMode, setReviewMode] = useState(false)
    const [currentReview, setCurrentReview] = useState(0)
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    const totalQuestions = questions.length || 1
    const correctCount = questions.reduce((count, q, i) => count + (answers[i] === q.correctAnswer ? 1 : 0), 0)
    const score = Math.round((correctCount / totalQuestions) * 100)
    const skipped = questions.length - Object.keys(answers).length
    const incorrectAnswers = questions
        .map((q, i) => ({ ...q, index: i }))
        .filter(q => answers[q.index] !== q.correctAnswer)

    const saveResults = useCallback(async () => {
        if (!user || saved || saving) return saved
        setSaving(true)
        setSaveError('')

        try {
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

            const { data: latestAttempt, error: latestError } = await supabase
                .from('test_attempts')
                .select('assessment_type, module_name, score, total_questions, answers, time_taken_seconds, mode, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (latestError) throw latestError

            if (isLikelyDuplicateAttempt(latestAttempt, payload)) {
                setSaved(true)
                return true
            }

            const { error } = await supabase.from('test_attempts').insert(payload)
            if (error) throw error
            setSaved(true)

            // Notify dashboard to refresh attempts even without a full page reload.
            window.dispatchEvent(new Event('attempt-saved'))
            return true
        } catch (err) {
            console.error('Failed to save results:', err)
            setSaveError(err?.message || 'Unable to save results right now.')
            return false
        } finally {
            setSaving(false)
        }
    }, [
        user,
        saved,
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
        saveResults()
    }, [saveResults])

    async function handleBackToDashboard() {
        if (!saved) {
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
                    <div className="score-review__options">
                        {q.options.map((option, oi) => (
                            <div
                                key={oi}
                                className={`score-review__option ${oi === q.correctAnswer
                                    ? 'score-review__option--correct'
                                    : answers[q.index] === oi
                                        ? 'score-review__option--wrong'
                                        : ''}`}
                            >
                                <span>{String.fromCharCode(65 + oi)}</span>
                                <p>{option}</p>
                            </div>
                        ))}
                    </div>

                    {q.explanation && (
                        <div className="score-review__explanation">
                            <h4>Explanation</h4>
                            <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                        </div>
                    )}

                    <AIExplainer question={q} />
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
                <button className="btn btn--ghost" onClick={handleBackToDashboard} disabled={saving}>
                    <ArrowLeft size={16} />
                    Dashboard
                </button>
            </div>
        </section>
    )
}
