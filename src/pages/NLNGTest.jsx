import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import deductiveQuestions from '../data/nlng-deductive-questions.json'
import { selectUniqueSessionQuestions } from '../utils/questionSession'
import {
    Lightbulb,
    ArrowLeft,
    AlertCircle,
    Play,
    BookOpen,
    StopCircle,
    Timer as TimerIcon,
} from 'lucide-react'

const QUESTION_OPTIONS = [10, 15, 16, 18, 24, 30]
const TIME_OPTIONS_MINUTES = [10, 15, 18, 25, 30]
const REAL_SHL_QUESTION_COUNT = 16
const REAL_SHL_TIME_MINUTES = 18
const DEFAULT_QUESTION_COUNT = REAL_SHL_QUESTION_COUNT
const DEFAULT_TIME_MINUTES = REAL_SHL_TIME_MINUTES

function isValidDeductiveQuestion(question) {
    const correctAnswer = question?.correctAnswer
    const options = question?.options

    if (!Number.isInteger(correctAnswer) || correctAnswer < 0) return false
    if (!Array.isArray(options) || options.length < 2) return false
    return correctAnswer < options.length
}

export default function NLNGTest() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [sessionPreset, setSessionPreset] = useState('real')
    const [mode, setMode] = useState('exam')
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(DEFAULT_TIME_MINUTES)
    const [activeQuestions, setActiveQuestions] = useState([])
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [timeTaken, setTimeTaken] = useState(0)
    const startTimeRef = useRef(null)

    const allDeductiveQuestions = deductiveQuestions.filter((question) => question.subtest === 'deductive')
    const availableQuestions = allDeductiveQuestions.filter(isValidDeductiveQuestion)
    const excludedDraftCount = allDeductiveQuestions.length - availableQuestions.length
    const totalTimeSeconds = timeLimitMinutes * 60
    const isExamMode = mode === 'exam'

    function applyRealPreset() {
        setSessionPreset('real')
        setMode('exam')
        setQuestionCount(Math.min(REAL_SHL_QUESTION_COUNT, availableQuestions.length || REAL_SHL_QUESTION_COUNT))
        setTimeLimitMinutes(REAL_SHL_TIME_MINUTES)
    }

    function applyCustomPreset() {
        setSessionPreset('custom')
    }

    function startTest() {
        const selectedQuestions = selectUniqueSessionQuestions(availableQuestions, questionCount)

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
                            <h3>Session Preset</h3>
                            <div className="test-setup__time-options">
                                <button
                                    className={`test-setup__time-btn ${sessionPreset === 'real' ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={applyRealPreset}
                                >
                                    SHL Real (16Q / 18m)
                                </button>
                                <button
                                    className={`test-setup__time-btn ${sessionPreset === 'custom' ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={applyCustomPreset}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

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
                                    onClick={() => {
                                        setMode('practice')
                                        setSessionPreset('custom')
                                    }}
                                    disabled={sessionPreset === 'real'}
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
                                        className={`test-setup__time-btn ${questionCount === count && questionCount < availableQuestions.length ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => {
                                            setSessionPreset('custom')
                                            setQuestionCount(count)
                                        }}
                                        disabled={count > availableQuestions.length}
                                    >
                                        {count} Qs
                                    </button>
                                ))}
                                <button
                                    key="all"
                                    className={`test-setup__time-btn ${questionCount >= availableQuestions.length ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={() => {
                                        setSessionPreset('custom')
                                        setQuestionCount(availableQuestions.length)
                                    }}
                                >
                                    All ({availableQuestions.length})
                                </button>
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Time Limit (Exam)</h3>
                            <div className="test-setup__time-options">
                                {TIME_OPTIONS_MINUTES.map((minutes) => (
                                    <button
                                        key={minutes}
                                        className={`test-setup__time-btn ${timeLimitMinutes === minutes ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => {
                                            setSessionPreset('custom')
                                            setTimeLimitMinutes(minutes)
                                        }}
                                        disabled={sessionPreset === 'real'}
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
                                {sessionPreset === 'real'
                                    ? `${questionCount} questions in ${timeLimitMinutes} minutes (SHL-style timed run).`
                                    : `${questionCount} questions${isExamMode ? ` in ${timeLimitMinutes} minutes.` : ' in untimed practice mode.'}`}
                                {excludedDraftCount > 0 ? ` (${excludedDraftCount} draft questions excluded)` : ''}
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
                    <button className="btn btn--secondary btn--sm flex items-center gap-1" onClick={finishTest}>
                        <StopCircle size={14} /> End Test
                    </button>
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
