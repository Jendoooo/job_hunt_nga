import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, StopCircle, Timer as TimerIcon } from 'lucide-react'
import Timer from '../components/Timer'
import ScoreReport from '../components/ScoreReport'
import sjqQuestions from '../data/nlng-sjq-questions.json'
import { shuffleQuestions } from '../utils/questionSession'
import { scoreSJQQuestionUnits } from '../utils/sjqAnalytics'
import { earlySaveAttempt } from '../utils/earlySave'
import { useAuth } from '../context/useAuth'

const QUESTION_OPTIONS = [10, 20, 30]
const TIME_OPTIONS_MINUTES = [10, 15, 20, 25, 30]
const DEFAULT_QUESTION_COUNT = 10
const DEFAULT_TIME_MINUTES = 20

const LESS_EFFECTIVE = 1
const MORE_EFFECTIVE = 4

function scoreSessionUnits(questions, answers) {
    let earned = 0
    let total = 0

    for (let i = 0; i < questions.length; i += 1) {
        const { earned: qEarned, total: qTotal } = scoreSJQQuestionUnits(questions[i], answers?.[i])
        earned += qEarned
        total += qTotal
    }

    return { earned, total }
}

export default function NLNGSJQTest() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const startTimeRef = useRef(null)
    const attemptIdRef = useRef(null)

    const [stage, setStage] = useState('setup')
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(DEFAULT_TIME_MINUTES)
    const [activeQuestions, setActiveQuestions] = useState([])
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timeTaken, setTimeTaken] = useState(0)

    const questionBank = Array.isArray(sjqQuestions) ? sjqQuestions : []
    const timeLimitSeconds = timeLimitMinutes * 60

    const question = activeQuestions[currentQuestion]

    function startAssessment() {
        const selected = shuffleQuestions(questionBank).slice(0, Math.min(questionCount, questionBank.length))
        setActiveQuestions(selected)
        setAnswers({})
        setCurrentQuestion(0)
        setTimeTaken(0)
        setStage('test')
        startTimeRef.current = Date.now()
    }

    function finishAssessment() {
        const elapsed = startTimeRef.current
            ? Math.round((Date.now() - startTimeRef.current) / 1000)
            : timeLimitSeconds
        setTimeTaken(elapsed)

        if (user && activeQuestions.length > 0) {
            if (!attemptIdRef.current) attemptIdRef.current = crypto.randomUUID()
            const { earned, total } = scoreSessionUnits(activeQuestions, answers)
            earlySaveAttempt({
                attemptId: attemptIdRef.current,
                user,
                questions: activeQuestions,
                answers,
                assessmentType: 'nlng_sjq',
                moduleName: `SHL Job-Focused Assessment (${activeQuestions.length}Q / ${timeLimitMinutes}m)`,
                elapsed,
                mode: 'exam',
                scoreOverride: earned,
                totalOverride: total,
            })
        }

        setStage('finish')
    }

    function handleRate(responseId, ratingValue) {
        setAnswers((prev) => {
            const current = prev[currentQuestion] && typeof prev[currentQuestion] === 'object'
                ? prev[currentQuestion]
                : {}

            const alreadySelected = Number(current?.[responseId]) === Number(ratingValue)
            const nextMap = { ...current }

            if (alreadySelected) {
                delete nextMap[responseId]
            } else {
                nextMap[responseId] = ratingValue
            }

            return {
                ...prev,
                [currentQuestion]: {
                    ...nextMap,
                },
            }
        })
    }

    if (stage === 'setup') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <Brain className="text-sky-500" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">SHL Job-Focused Assessment</h1>
                    </div>
                </header>

                <div className="test-setup">
                    <div className="sjq-instructions">
                        <div className="sjq-instructions__section">
                            <div className="sjq-instructions__title">Instructions</div>
                            <div className="sjq-instructions__content">
                                <p>
                                    This assessment is designed to help you become familiar with completing a Situational Judgement Test (SJT).
                                    You will be given different situations you might find yourself in while at work.
                                </p>
                                <p>
                                    For each response, select either <strong>More Effective</strong> or <strong>Less Effective</strong> based on
                                    how you think the best way is to respond. All questions must be answered. Once you move on, you will not
                                    have the opportunity to change your answers.
                                </p>
                                <p className="sjq-instructions__warning">
                                    Do not refresh, reload, or use the browser Back button during the assessment.
                                </p>
                            </div>
                        </div>

                        <div className="sjq-instructions__section">
                            <div className="sjq-instructions__title">Question Count</div>
                            <div className="test-setup__time-options">
                                {QUESTION_OPTIONS.map((count) => (
                                    <button
                                        key={count}
                                        className={`test-setup__time-btn ${questionCount === count && questionCount < questionBank.length ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => setQuestionCount(count)}
                                        disabled={count > questionBank.length}
                                    >
                                        {count} Qs
                                    </button>
                                ))}
                                <button
                                    key="all"
                                    className={`test-setup__time-btn ${questionCount >= questionBank.length ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={() => setQuestionCount(questionBank.length)}
                                >
                                    All ({questionBank.length})
                                </button>
                            </div>
                        </div>

                        <div className="sjq-instructions__section">
                            <div className="sjq-instructions__title">Time Limit</div>
                            <div className="test-setup__time-options">
                                {TIME_OPTIONS_MINUTES.map((minutes) => (
                                    <button
                                        key={minutes}
                                        className={`test-setup__time-btn ${timeLimitMinutes === minutes ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => setTimeLimitMinutes(minutes)}
                                    >
                                        {minutes} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="sjq-instructions__section">
                            <div className="sjq-instructions__title">General</div>
                            <div className="sjq-instructions__content">
                                <div><strong>Number of questions:</strong> {Math.min(questionCount, questionBank.length)}</div>
                                <div><strong>Time limit:</strong> {timeLimitMinutes} minutes</div>
                                <div><strong>Question bank:</strong> randomised from {questionBank.length} scenarios</div>
                            </div>
                        </div>

                        <div className="sjq-instructions__actions">
                            <button
                                className="btn btn--primary btn--lg flex items-center justify-center gap-2"
                                onClick={startAssessment}
                                disabled={questionBank.length === 0}
                            >
                                Take Assessment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (stage === 'finish') {
        const { earned, total } = scoreSessionUnits(activeQuestions, answers)
        const answersByQuestionId = activeQuestions.reduce((accumulator, q, index) => {
            const value = answers?.[index]
            accumulator[q.id] = value && typeof value === 'object' ? value : {}
            return accumulator
        }, {})
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <div className="flex items-center gap-2">
                        <Brain className="text-sky-500" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">SHL Job-Focused Assessment - Results</h1>
                    </div>
                </header>

                <ScoreReport
                    questions={activeQuestions}
                    answers={answers}
                    answersForSave={answersByQuestionId}
                    flagged={[]}
                    timeTaken={timeTaken || timeLimitSeconds}
                    totalTime={timeLimitSeconds}
                    assessmentType="nlng_sjq"
                    moduleName={`SHL Job-Focused Assessment (${activeQuestions.length}Q / ${timeLimitMinutes}m)`}
                    mode="exam"
                    scoreCorrectUnits={earned}
                    scoreTotalUnits={total}
                    scoreUnitLabel="alignment points"
                    attemptId={attemptIdRef.current}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    if (!question) return null

    const currentAnswer = answers[currentQuestion] && typeof answers[currentQuestion] === 'object'
        ? answers[currentQuestion]
        : {}
    const allRated = (question.responses || []).every((r) => {
        const value = Number(currentAnswer?.[r.id])
        return value === LESS_EFFECTIVE || value === MORE_EFFECTIVE
    })
    const isLast = currentQuestion >= activeQuestions.length - 1

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 bg-sky-500">
                        <Brain size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Situational Judgement</h2>
                        <div className="test-page__subtest-progress">
                            Question {currentQuestion + 1} of {activeQuestions.length}
                        </div>
                    </div>
                </div>

                <div className="test-page__header-right">
                    <div className="flex items-center gap-2">
                        <TimerIcon size={16} className="text-slate-500" />
                        <Timer duration={timeLimitSeconds} onTimeUp={finishAssessment} />
                    </div>
                    <button className="btn btn--secondary btn--sm flex items-center gap-1" onClick={finishAssessment}>
                        <StopCircle size={14} /> End Test
                    </button>
                </div>
            </header>

            <div className="test-page__body test-page__body--single">
                <div className="test-page__content">
                    <div className="sjq-portal">
                        <div className="sjq-portal__card">
                            <div className="sjq-portal__card-head">
                                Question {currentQuestion + 1}
                            </div>

                            <div className="sjq-portal__scenario">
                                {question.scenario}
                            </div>

                            <div className="sjq-portal__prompt">
                                {question.question}
                            </div>

                            <div className="sjq-portal__rows" role="group" aria-label="Responses">
                                {(question.responses || []).map((response) => {
                                    const selected = Number(currentAnswer?.[response.id]) || null
                                    const lessLabel = selected === LESS_EFFECTIVE ? 'Clear' : 'Less Effective'
                                    const moreLabel = selected === MORE_EFFECTIVE ? 'Clear' : 'More Effective'
                                    const rowSelected = selected === LESS_EFFECTIVE || selected === MORE_EFFECTIVE

                                    return (
                                        <div
                                            key={response.id}
                                            className={`sjq-effect-row ${rowSelected ? 'sjq-effect-row--selected' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                className={`sjq-effect-rail sjq-effect-rail--less ${selected === LESS_EFFECTIVE ? 'sjq-effect-rail--clear' : ''}`}
                                                onClick={() => handleRate(response.id, LESS_EFFECTIVE)}
                                                aria-pressed={selected === LESS_EFFECTIVE}
                                            >
                                                {lessLabel}
                                            </button>

                                            <div className="sjq-effect-body">
                                                <div className="sjq-effect-text">
                                                    {response.text}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className={`sjq-effect-rail sjq-effect-rail--more ${selected === MORE_EFFECTIVE ? 'sjq-effect-rail--clear' : ''}`}
                                                onClick={() => handleRate(response.id, MORE_EFFECTIVE)}
                                                aria-pressed={selected === MORE_EFFECTIVE}
                                            >
                                                {moreLabel}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="sjq-portal__actions">
                                <button
                                    className="sjq-next-btn"
                                    onClick={() => {
                                        if (!allRated) return
                                        if (isLast) {
                                            finishAssessment()
                                        } else {
                                            setCurrentQuestion((prev) => prev + 1)
                                        }
                                    }}
                                    disabled={!allRated}
                                >
                                    {isLast ? 'Finish' : 'Next'}
                                </button>
                            </div>

                            <div className="sjq-portal__hint">
                                Once you move on, you will not have the opportunity to change your answers.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
