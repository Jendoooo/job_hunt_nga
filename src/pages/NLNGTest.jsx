import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import deductiveQuestions from '../data/nlng-deductive-questions.json'
import {
    Lightbulb,
    ArrowLeft,
    AlertCircle,
    Play,
    BookOpen,
    Timer as TimerIcon,
} from 'lucide-react'

const QUESTION_OPTIONS = [10, 15, 18]
const TIME_OPTIONS_MINUTES = [10, 15, 18, 25]
const DEFAULT_QUESTION_COUNT = 18
const DEFAULT_TIME_MINUTES = 18

function shuffleQuestions(items) {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[randomIndex]] = [next[randomIndex], next[i]]
    }
    return next
}

export default function NLNGTest() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [mode, setMode] = useState('exam')
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(DEFAULT_TIME_MINUTES)
    const [activeQuestions, setActiveQuestions] = useState([])
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [timeTaken, setTimeTaken] = useState(0)
    const startTimeRef = useRef(null)

    const availableQuestions = deductiveQuestions.filter((question) => question.subtest === 'deductive')
    const totalTimeSeconds = timeLimitMinutes * 60
    const isExamMode = mode === 'exam'

    function startTest() {
        const maxQuestions = Math.min(questionCount, availableQuestions.length)
        const selectedQuestions = shuffleQuestions(availableQuestions).slice(0, maxQuestions)

        setActiveQuestions(selectedQuestions)
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

    function handleAnswer(answerIndex) {
        setAnswers((prev) => ({ ...prev, [currentQuestion]: answerIndex }))
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
                        <Lightbulb className="text-sky-500" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">NLNG SHL Deductive</h1>
                    </div>
                </header>

                <div className="test-setup">
                    <div className="test-setup__card">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Assessment Session</h2>
                        <p className="test-setup__description">
                            Choose timed exam mode or untimed practice mode with immediate correctness feedback.
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
                                    <span className="test-setup__mode-desc">Timed assessment, final-only scoring</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('practice')}
                                >
                                    <BookOpen className={`mb-2 ${mode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Practice Mode</span>
                                    <span className="test-setup__mode-desc">Untimed with immediate correctness</span>
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
                                <BookOpen className="text-sky-600 shrink-0" size={18} />
                                <h3 className="font-bold text-sky-900">What to Expect</h3>
                            </div>
                            <ul className="text-sm text-sky-800 space-y-2 list-disc list-inside">
                                <li>Each question tests logical inference from fixed statements.</li>
                                <li>Choose the option guaranteed by the information given.</li>
                                <li>{isExamMode ? 'Timed mode: answer before the clock runs out.' : 'Practice mode: no timer pressure.'}</li>
                            </ul>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-8 flex items-start gap-3">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div className="text-sm text-amber-800">
                                <strong className="block mb-1">Session Summary</strong>
                                {questionCount} questions
                                {isExamMode ? ` in ${timeLimitMinutes} minutes.` : ' in untimed practice mode.'}
                            </div>
                        </div>

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startTest}
                            disabled={availableQuestions.length === 0}
                        >
                            <Play size={18} /> Start {isExamMode ? 'Assessment' : 'Practice'}
                        </button>
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
                        <Lightbulb className="text-sky-500" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">NLNG SHL - Results</h1>
                    </div>
                </header>

                <ScoreReport
                    questions={activeQuestions}
                    answers={answers}
                    flagged={flagged}
                    timeTaken={timeTaken || (isExamMode ? totalTimeSeconds : 0)}
                    totalTime={isExamMode ? totalTimeSeconds : 0}
                    assessmentType="nlng-shl"
                    moduleName={`NLNG SHL Deductive (${mode}, ${activeQuestions.length}Q${isExamMode ? ` / ${timeLimitMinutes}m` : ''})`}
                    mode={mode}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const question = activeQuestions[currentQuestion]
    if (!question) return null

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 bg-sky-500">
                        <Lightbulb size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Deductive Reasoning</h2>
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
