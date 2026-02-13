import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, StopCircle, Timer as TimerIcon } from 'lucide-react'
import Timer from '../components/Timer'
import ScoreReport from '../components/ScoreReport'
import sjqQuestions from '../data/nlng-sjq-questions.json'
import { shuffleQuestions } from '../utils/questionSession'
import { scoreSJQQuestionUnits } from '../utils/sjqAnalytics'

const TIME_LIMIT_SECONDS = 20 * 60
const SESSION_QUESTION_COUNT = 10

const RATING_SCALE = [
    { value: 1, label: 'Very Ineffective' },
    { value: 2, label: 'Ineffective' },
    { value: 3, label: 'Effective' },
    { value: 4, label: 'Very Effective' },
]

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
    const startTimeRef = useRef(null)

    const [stage, setStage] = useState('setup')
    const [activeQuestions, setActiveQuestions] = useState([])
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timeTaken, setTimeTaken] = useState(0)

    const questionBank = Array.isArray(sjqQuestions) ? sjqQuestions : []

    const question = activeQuestions[currentQuestion]

    function startAssessment() {
        const selected = shuffleQuestions(questionBank).slice(0, Math.min(SESSION_QUESTION_COUNT, questionBank.length))
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
            : TIME_LIMIT_SECONDS
        setTimeTaken(elapsed)
        setStage('finish')
    }

    function handleRate(responseId, ratingValue) {
        setAnswers((prev) => {
            const current = prev[currentQuestion] && typeof prev[currentQuestion] === 'object'
                ? prev[currentQuestion]
                : {}
            return {
                ...prev,
                [currentQuestion]: {
                    ...current,
                    [responseId]: ratingValue,
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
                    <div className="test-setup__card">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">SHL Job-Focused Assessment</h2>
                        <p className="test-setup__description">
                            Situational Judgement | {SESSION_QUESTION_COUNT} Questions | 20 minutes
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-sm text-slate-700">
                            Rate how effective each response would be in the workplace. You must rate all responses
                            before moving to the next question. Session questions are randomized from a bank of {questionBank.length}.
                        </div>

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startAssessment}
                            disabled={questionBank.length === 0}
                        >
                            Start Assessment
                        </button>
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
                    timeTaken={timeTaken || TIME_LIMIT_SECONDS}
                    totalTime={TIME_LIMIT_SECONDS}
                    assessmentType="nlng_sjq"
                    moduleName={`SHL Job-Focused Assessment (${activeQuestions.length}Q / 20m)`}
                    mode="exam"
                    scoreCorrectUnits={earned}
                    scoreTotalUnits={total}
                    scoreUnitLabel="alignment points"
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
    const allRated = (question.responses || []).every((r) => currentAnswer[r.id] != null)
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
                        <Timer duration={TIME_LIMIT_SECONDS} onTimeUp={finishAssessment} />
                    </div>
                    <button className="btn btn--secondary btn--sm flex items-center gap-1" onClick={finishAssessment}>
                        <StopCircle size={14} /> End Test
                    </button>
                </div>
            </header>

            <div className="test-page__body">
                <div className="test-page__content">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="question-card__rules mb-4">
                            <div className="text-sm font-semibold text-slate-100 mb-2">
                                Question {currentQuestion + 1} of {activeQuestions.length}
                            </div>
                            <div className="text-slate-100 leading-relaxed text-sm">
                                {question.scenario}
                            </div>
                        </div>

                        <div className="question-card">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">
                                {question.question}
                            </h3>

                            <div className="space-y-4">
                                {(question.responses || []).map((response) => {
                                    const selected = Number(currentAnswer?.[response.id]) || null
                                    return (
                                        <div key={response.id} className="sjq-question-block">
                                            <div className="sjq-response-text">
                                                <strong className="mr-2">{String(response.id).toUpperCase()}.</strong>
                                                {response.text}
                                            </div>

                                            <div className="sjq-rating-pills" role="group" aria-label={`Rate response ${response.id}`}>
                                                {RATING_SCALE.map((opt) => {
                                                    const isSelected = selected === opt.value
                                                    const colorClass = opt.value >= 3 ? 'sjq-pill--effective' : 'sjq-pill--ineffective'
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            className={`sjq-pill ${isSelected ? colorClass : ''}`}
                                                            aria-pressed={isSelected}
                                                            onClick={() => handleRate(response.id, opt.value)}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="test-page__nav-buttons mt-6">
                                <button
                                    className="btn btn--primary"
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
                                    {isLast ? 'Finish' : 'Next ->'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
