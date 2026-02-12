import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import RenderErrorBoundary from '../components/RenderErrorBoundary'
import interactiveQuestions from '../data/shl-interactive-questions.json'
import { selectUniqueSessionQuestions } from '../utils/questionSession'
import {
    ArrowLeft,
    BookOpen,
    ChartNoAxesCombined,
    Hand,
    Play,
    Timer as TimerIcon,
} from 'lucide-react'

const QUESTION_OPTIONS = [5, 10, 15, 20, 30, 40, 50]
const TIME_OPTIONS_MINUTES = [10, 15, 20, 25, 30, 40]
const DIFFICULTY_OPTIONS = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
]
const DEFAULT_QUESTION_COUNT = 15
const DEFAULT_TIME_MINUTES = 20

function normalizeDifficulty(value) {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') {
        return normalized
    }
    return null
}

function getQuestionDifficulty(question) {
    const explicit = normalizeDifficulty(question?.difficulty)
    if (explicit) return explicit

    if (question?.subtype === 'interactive_numerical_hard') return 'hard'
    return 'medium'
}

export default function NLNGInteractiveTest() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [mode, setMode] = useState('exam')
    const [difficulty, setDifficulty] = useState('medium')
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(DEFAULT_TIME_MINUTES)
    const [activeQuestions, setActiveQuestions] = useState([])
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [timeTaken, setTimeTaken] = useState(0)
    const [sessionError, setSessionError] = useState('')
    const startTimeRef = useRef(null)

    const availableQuestions = useMemo(() => (
        interactiveQuestions.filter((question) =>
            typeof question?.subtype === 'string' &&
            question.subtype.startsWith('interactive_numerical') &&
            getQuestionDifficulty(question) === difficulty
        )
    ), [difficulty])
    const totalTimeSeconds = timeLimitMinutes * 60
    const isExamMode = mode === 'exam'
    const difficultyLabel = DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label || 'Medium'

    function startTest() {
        const selected = selectUniqueSessionQuestions(availableQuestions, questionCount)
        if (selected.length === 0) {
            setSessionError('No questions are available for this difficulty right now. Change difficulty and try again.')
            return
        }

        setSessionError('')
        setActiveQuestions(selected)
        setCurrentQuestion(0)
        setAnswers({})
        setFlagged([])
        setTimeTaken(0)
        setStage('test')
        startTimeRef.current = Date.now()
    }

    function finishTest() {
        const elapsed = startTimeRef.current
            ? Math.round((Date.now() - startTimeRef.current) / 1000)
            : totalTimeSeconds
        setTimeTaken(elapsed)
        setStage('finish')
    }

    function handleAnswer(answerValue) {
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion]: answerValue,
        }))
    }

    function toggleFlag() {
        setFlagged((prev) =>
            prev.includes(currentQuestion)
                ? prev.filter((index) => index !== currentQuestion)
                : [...prev, currentQuestion]
        )
    }

    if (stage === 'setup') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <ChartNoAxesCombined className="text-sky-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">NLNG Interactive Numerical</h1>
                    </div>
                </header>

                <div className="test-setup">
                    <div className="test-setup__card">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Interactive Session</h2>
                        <p className="test-setup__description">
                            Tackle drag-table, pie-ratio, and stacked-bar adjustment tasks in one mixed set.
                        </p>

                        <div className="test-setup__mode">
                            <h3>Mode</h3>
                            <div className="test-setup__mode-options">
                                <button
                                    className={`test-setup__mode-btn ${mode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('exam')}
                                >
                                    <TimerIcon className={`mb-2 ${mode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Exam Mode</span>
                                    <span className="test-setup__mode-desc">Timed and scored at the end</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('practice')}
                                >
                                    <BookOpen className={`mb-2 ${mode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Practice Mode</span>
                                    <span className="test-setup__mode-desc">Immediate correctness feedback</span>
                                </button>
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Difficulty</h3>
                            <div className="max-w-xs">
                                <select
                                    className="test-setup__select"
                                    value={difficulty}
                                    onChange={(event) => setDifficulty(event.target.value)}
                                    aria-label="Select difficulty level"
                                >
                                    {DIFFICULTY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {availableQuestions.length} questions available for {difficultyLabel.toLowerCase()} mode.
                            </p>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Question Count</h3>
                            <div className="test-setup__time-options">
                                {QUESTION_OPTIONS.map((count) => (
                                    <button
                                        key={count}
                                        className={`test-setup__time-btn ${questionCount === count ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => setQuestionCount(count)}
                                        disabled={count > availableQuestions.length}
                                    >
                                        {count} Qs
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Time Limit (Exam)</h3>
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

                        <div className="bg-sky-50 border border-sky-100 rounded-xl p-6 mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <Hand className="text-sky-600 shrink-0" size={18} />
                                <h3 className="font-bold text-sky-900">Interaction Modes</h3>
                            </div>
                            <ul className="text-sm text-sky-800 space-y-2 list-disc list-inside">
                                <li>Drag table labels into result cells.</li>
                                <li>Resize pie allocations by increment controls.</li>
                                <li>Adjust stacked-bar total and internal split.</li>
                                <li>{isExamMode ? 'Timed under exam pressure.' : 'Practice with immediate correctness.'}</li>
                            </ul>
                        </div>

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startTest}
                            disabled={availableQuestions.length === 0}
                        >
                            <Play size={18} /> Start {isExamMode ? 'Assessment' : 'Practice'}
                        </button>

                        {sessionError && (
                            <div className="auth-form__message auth-form__message--error mt-3">
                                {sessionError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (stage === 'finish') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <div className="flex items-center gap-2">
                        <ChartNoAxesCombined className="text-sky-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">NLNG Interactive Numerical - Results</h1>
                    </div>
                </header>
                <ScoreReport
                    questions={activeQuestions}
                    answers={answers}
                    flagged={flagged}
                    timeTaken={timeTaken || (isExamMode ? totalTimeSeconds : 0)}
                    totalTime={isExamMode ? totalTimeSeconds : 0}
                    assessmentType="nlng-interactive-numerical"
                    moduleName={`NLNG Interactive Numerical (${difficulty}, ${mode}, ${activeQuestions.length}Q${isExamMode ? ` / ${timeLimitMinutes}m` : ''})`}
                    mode={mode}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const question = activeQuestions[currentQuestion]
    if (!question) {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <ChartNoAxesCombined className="text-sky-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">NLNG Interactive Numerical</h1>
                    </div>
                </header>
                <div className="test-setup">
                    <div className="test-setup__card">
                        <h2 className="text-xl font-bold text-slate-800">Session Error</h2>
                        <p className="test-setup__description">
                            This session could not load the next question. Return to setup and start a fresh run.
                        </p>
                        <div className="flex gap-3">
                            <button className="btn btn--secondary" onClick={() => setStage('setup')}>Back to Setup</button>
                            <button className="btn btn--primary" onClick={() => navigate('/')}>Dashboard</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 bg-sky-600">
                        <ChartNoAxesCombined size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Interactive Numerical</h2>
                        <div className="test-page__subtest-progress">
                            Question {currentQuestion + 1} of {activeQuestions.length}
                        </div>
                    </div>
                </div>

                <div className="test-page__header-right">
                    {isExamMode ? (
                        <div className="flex items-center gap-2">
                            <TimerIcon size={16} className="text-slate-500" />
                            <Timer duration={totalTimeSeconds} onTimeUp={finishTest} />
                        </div>
                    ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            Practice Mode
                        </span>
                    )}
                </div>
            </header>

            <div className="test-page__body">
                <aside className="test-page__sidebar hidden lg:block">
                    <QuestionNav
                        totalQuestions={activeQuestions.length}
                        currentQuestion={currentQuestion}
                        answers={answers}
                        flagged={flagged}
                        onNavigate={setCurrentQuestion}
                    />
                </aside>

                <div className="test-page__content">
                    <div className="max-w-3xl mx-auto w-full">
                        <RenderErrorBoundary
                            resetKey={`${question?.id}-${currentQuestion}`}
                            fallback={({ message }) => (
                                <div className="auth-form__message auth-form__message--error">
                                    Could not render this question: {message}
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn--secondary btn--sm"
                                            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--primary btn--sm"
                                            onClick={() => setCurrentQuestion((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
                                        >
                                            Next
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm"
                                            onClick={() => setStage('setup')}
                                        >
                                            Restart
                                        </button>
                                    </div>
                                </div>
                            )}
                        >
                            <QuestionCard
                                question={question}
                                questionNumber={currentQuestion + 1}
                                totalQuestions={activeQuestions.length}
                                selectedAnswer={answers[currentQuestion]}
                                onSelectAnswer={handleAnswer}
                                showResult={!isExamMode && answers[currentQuestion] !== undefined}
                                correctAnswer={question.correctAnswer}
                                isFlagged={flagged.includes(currentQuestion)}
                                onToggleFlag={toggleFlag}
                            />
                        </RenderErrorBoundary>

                        <div className="test-page__nav-buttons mt-6">
                            <button
                                className="btn btn--secondary"
                                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                                disabled={currentQuestion === 0}
                            >
                                Previous
                            </button>

                            {currentQuestion < activeQuestions.length - 1 ? (
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
