import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import AIExplainer from '../components/AIExplainer'
import practiceQuestions from '../data/saville-practice-questions.json'
import { selectUniqueSessionQuestions } from '../utils/questionSession'
import {
    Wrench,
    ArrowLeft,
    BookOpen,
    Timer as TimerIcon,
    Play,
} from 'lucide-react'

const QUESTION_OPTIONS = [10, 15, 20, 30]
const TIME_OPTIONS_MINUTES = [15, 30, 45, 60]
const DEFAULT_QUESTION_COUNT = 20
const DEFAULT_TIME_MINUTES = 30

export default function SavillePractice() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [mode, setMode] = useState('practice')
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(DEFAULT_TIME_MINUTES)
    const [sessionQuestions, setSessionQuestions] = useState([])
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [showExplanation, setShowExplanation] = useState({})
    const [timeTaken, setTimeTaken] = useState(0)
    const startTimeRef = useRef(null)

    const totalTimeSeconds = timeLimitMinutes * 60

    function startTest() {
        const selectedQuestions = selectUniqueSessionQuestions(practiceQuestions, questionCount)

        setSessionQuestions(selectedQuestions)
        setCurrentQuestion(0)
        setAnswers({})
        setFlagged([])
        setShowExplanation({})
        setTimeTaken(0)
        setStage('test')
        startTimeRef.current = Date.now()
    }

    function handleAnswer(answerIndex) {
        setAnswers((prev) => ({ ...prev, [currentQuestion]: answerIndex }))
        if (mode === 'practice') {
            setShowExplanation((prev) => ({ ...prev, [currentQuestion]: true }))
        }
    }

    function finishTest() {
        const elapsed = startTimeRef.current
            ? Math.floor((Date.now() - startTimeRef.current) / 1000)
            : 0
        setTimeTaken(elapsed)
        setStage('review')
    }

    if (stage === 'setup') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <Wrench className="text-emerald-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Process Engineer Practice</h1>
                    </div>
                </header>

                <div className="test-setup">
                    <div className="test-setup__card">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Practice Session</h2>
                        <p className="test-setup__description">
                            Choose your mode, question count, and time limit for focused engineering drill practice.
                        </p>

                        <div className="test-setup__mode">
                            <h3>Select Mode</h3>
                            <div className="test-setup__mode-options">
                                <button
                                    className={`test-setup__mode-btn ${mode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('practice')}
                                >
                                    <BookOpen className={`mb-2 ${mode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Practice Mode</span>
                                    <span className="test-setup__mode-desc">Show worked explanations while answering</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('exam')}
                                >
                                    <TimerIcon className={`mb-2 ${mode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Exam Mode</span>
                                    <span className="test-setup__mode-desc">No explanations until score report</span>
                                </button>
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Question Count</h3>
                            <div className="test-setup__time-options">
                                {QUESTION_OPTIONS.map((count) => (
                                    <button
                                        key={count}
                                        className={`test-setup__time-btn ${questionCount === count ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => setQuestionCount(count)}
                                        disabled={count > practiceQuestions.length}
                                    >
                                        {count} Qs
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Time Limit</h3>
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

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startTest}
                        >
                            <Play size={20} fill="currentColor" />
                            Start Practice ({questionCount} Qs / {timeLimitMinutes} min)
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (stage === 'review') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <div className="flex items-center gap-2">
                        <Wrench className="text-emerald-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Practice Results</h1>
                    </div>
                </header>
                <ScoreReport
                    questions={sessionQuestions}
                    answers={answers}
                    flagged={flagged}
                    timeTaken={timeTaken}
                    totalTime={totalTimeSeconds}
                    assessmentType="saville-practice"
                    moduleName={`Detailed Calculation Practice (${questionCount}Q / ${timeLimitMinutes}m)`}
                    mode={mode}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const question = sessionQuestions[currentQuestion]
    if (!question) {
        return null
    }

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <h2 className="text-sm font-bold text-slate-700 hidden sm:block">Process Engineer Practice</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                        Calculation
                    </span>
                </div>
                <div className="test-page__header-right">
                    <Timer duration={totalTimeSeconds} onTimeUp={finishTest} />
                    <button className="btn btn--danger btn--sm" onClick={finishTest}>
                        End Session
                    </button>
                </div>
            </header>

            <div className="test-page__body">
                <div className="test-page__sidebar hidden lg:block">
                    <QuestionNav
                        totalQuestions={sessionQuestions.length}
                        currentQuestion={currentQuestion}
                        answers={answers}
                        flagged={flagged}
                        onNavigate={setCurrentQuestion}
                    />
                </div>

                <div className="test-page__content">
                    <div className="max-w-3xl mx-auto w-full">
                        <QuestionCard
                            question={question}
                            questionNumber={currentQuestion + 1}
                            totalQuestions={sessionQuestions.length}
                            selectedAnswer={answers[currentQuestion]}
                            onSelectAnswer={handleAnswer}
                            showResult={mode === 'practice' && showExplanation[currentQuestion]}
                            correctAnswer={question.correctAnswer}
                            isFlagged={flagged.includes(currentQuestion)}
                            onToggleFlag={() => {
                                setFlagged((prev) =>
                                    prev.includes(currentQuestion)
                                        ? prev.filter((index) => index !== currentQuestion)
                                        : [...prev, currentQuestion]
                                )
                            }}
                        />

                        {mode === 'practice' && showExplanation[currentQuestion] && (
                            <AIExplainer question={question} />
                        )}

                        <div className="test-page__nav-buttons mt-6">
                            <button
                                className="btn btn--secondary"
                                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                                disabled={currentQuestion === 0}
                            >
                                Previous
                            </button>

                            {mode === 'practice' && answers[currentQuestion] !== undefined && !showExplanation[currentQuestion] && (
                                <button
                                    className="btn btn--primary"
                                    onClick={() => setShowExplanation((prev) => ({ ...prev, [currentQuestion]: true }))}
                                >
                                    Check Answer
                                </button>
                            )}

                            {currentQuestion < sessionQuestions.length - 1 ? (
                                <button
                                    className="btn btn--primary"
                                    onClick={() => setCurrentQuestion((prev) => prev + 1)}
                                >
                                    Next
                                </button>
                            ) : (
                                <button className="btn btn--primary" onClick={finishTest}>
                                    Finish
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
