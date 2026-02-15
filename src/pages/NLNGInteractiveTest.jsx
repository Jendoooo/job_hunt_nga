import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import RenderErrorBoundary from '../components/RenderErrorBoundary'
import interactiveQuestions from '../data/shl-interactive-questions.json'
import { selectUniqueSessionQuestions, shuffleQuestions } from '../utils/questionSession'
import {
    ArrowLeft,
    BookOpen,
    ChartNoAxesCombined,
    Hand,
    Play,
    StopCircle,
    Timer as TimerIcon,
} from 'lucide-react'

const QUESTION_OPTIONS = [5, 10, 15, 20, 30, 40, 50]
const TIME_OPTIONS_MINUTES = [10, 15, 18, 20, 25, 30, 40]
const DIFFICULTY_CHIPS = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
]
const TYPE_CHIPS = [
    { value: 'interactive_drag_table', label: 'Drag & Drop' },
    { value: 'interactive_pie_chart', label: 'Pie Chart' },
    { value: 'interactive_stacked_bar', label: 'Stacked Bar' },
    { value: 'interactive_point_graph', label: 'Point Graph' },
    { value: 'interactive_ranking', label: 'Ranking' },
    { value: 'interactive_tabbed_evaluation', label: 'Tabbed Eval' },
]
const ALL_DIFFICULTY_VALUES = new Set(DIFFICULTY_CHIPS.map((d) => d.value))
const ALL_TYPE_VALUES = new Set(TYPE_CHIPS.map((t) => t.value))
const REAL_SHL_QUESTION_COUNT = 10
const REAL_SHL_TIME_MINUTES = 18
const DEFAULT_QUESTION_COUNT = REAL_SHL_QUESTION_COUNT
const DEFAULT_TIME_MINUTES = REAL_SHL_TIME_MINUTES

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

function selectRealPresetQuestions(pool, count) {
    const wanted = [
        { type: 'interactive_stacked_bar', count: 3 },
        { type: 'interactive_pie_chart', count: 3 },
        { type: 'interactive_drag_table', count: 2 },
        { type: 'interactive_ranking', count: 1 },
        { type: 'interactive_point_graph', count: 1 },
    ]

    let remaining = [...pool]
    const picked = []

    for (const bucket of wanted) {
        if (picked.length >= count) break
        const needed = Math.min(bucket.count, count - picked.length)
        if (needed <= 0) continue

        const bucketPool = remaining.filter((q) => q?.type === bucket.type)
        let selected = []

        // Prefer multi-part drag-table sets (tabs) in the SHL Real preset.
        if (bucket.type === 'interactive_drag_table') {
            const multiPart = bucketPool.filter((q) => (q?.widget_data?.rows || []).length > 1)
            selected = selectUniqueSessionQuestions(multiPart, needed)
            if (selected.length < needed) {
                const pickedIds = new Set(selected.map((q) => q.id))
                const fallbackPool = bucketPool.filter((q) => !pickedIds.has(q.id))
                selected.push(...selectUniqueSessionQuestions(fallbackPool, needed - selected.length))
            }
        } else {
            selected = selectUniqueSessionQuestions(bucketPool, needed)
        }
        if (selected.length === 0) continue

        picked.push(...selected)
        const selectedIds = new Set(selected.map((q) => q.id))
        remaining = remaining.filter((q) => !selectedIds.has(q.id))
    }

    if (picked.length < count) {
        picked.push(...selectUniqueSessionQuestions(remaining, count - picked.length))
    }

    return shuffleQuestions(picked).slice(0, count)
}

export default function NLNGInteractiveTest() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [sessionPreset, setSessionPreset] = useState('real')
    const [mode, setMode] = useState('exam')
    const [selectedDifficulties, setSelectedDifficulties] = useState(new Set(ALL_DIFFICULTY_VALUES))
    const [selectedTypes, setSelectedTypes] = useState(new Set(ALL_TYPE_VALUES))
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)

    function toggleChip(current, setter, allValues, value) {
        const next = new Set(current)
        if (next.has(value)) {
            next.delete(value)
            if (next.size === 0) return // don't allow empty
        } else {
            next.add(value)
        }
        setter(next)
        setSessionPreset('custom')
    }
    const allDiffSelected = selectedDifficulties.size === ALL_DIFFICULTY_VALUES.size
    const allTypesSelected = selectedTypes.size === ALL_TYPE_VALUES.size
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
            selectedDifficulties.has(getQuestionDifficulty(question)) &&
            selectedTypes.has(question.type)
        )
    ), [selectedDifficulties, selectedTypes])
    const isRealPreset = sessionPreset === 'real'
    const effectiveMode = isRealPreset ? 'exam' : mode
    const effectiveQuestionCount = isRealPreset
        ? Math.min(REAL_SHL_QUESTION_COUNT, availableQuestions.length || REAL_SHL_QUESTION_COUNT)
        : questionCount
    const effectiveTimeLimitMinutes = isRealPreset ? REAL_SHL_TIME_MINUTES : timeLimitMinutes
    const totalTimeSeconds = effectiveTimeLimitMinutes * 60
    const isExamMode = effectiveMode === 'exam'
    const difficultyLabel = allDiffSelected ? 'all difficulties' : [...selectedDifficulties].join(', ')

    function applyRealPreset() {
        setSessionPreset('real')
    }

    function applyCustomPreset() {
        setSessionPreset('custom')
    }

    function startTest() {
        const selected = isRealPreset
            ? selectRealPresetQuestions(availableQuestions, effectiveQuestionCount)
            : selectUniqueSessionQuestions(availableQuestions, effectiveQuestionCount)
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
                            Tackle drag-table, ranking, pie, stacked-bar, tabbed evaluation, and point-graph tasks in one mixed set.
                        </p>

                        <div className="test-setup__mode">
                            <h3>Session Preset</h3>
                            <div className="test-setup__time-options">
                                <button
                                    className={`test-setup__time-btn ${sessionPreset === 'real' ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={applyRealPreset}
                                >
                                    SHL Real (10Q / 18m)
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
                                    className={`test-setup__mode-btn ${effectiveMode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('exam')}
                                >
                                    <TimerIcon className={`mb-2 ${effectiveMode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Exam Mode</span>
                                    <span className="test-setup__mode-desc">Timed and scored at the end</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${effectiveMode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => {
                                        setMode('practice')
                                        setSessionPreset('custom')
                                    }}
                                    disabled={sessionPreset === 'real'}
                                >
                                    <BookOpen className={`mb-2 ${effectiveMode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Practice Mode</span>
                                    <span className="test-setup__mode-desc">Immediate correctness feedback</span>
                                </button>
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Difficulty <span className="text-xs font-normal text-slate-400">(multi-select)</span></h3>
                            <div className="test-setup__time-options" style={{ flexWrap: 'wrap' }}>
                                <button
                                    className={`test-setup__time-btn ${allDiffSelected ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={() => { setSelectedDifficulties(new Set(ALL_DIFFICULTY_VALUES)); setSessionPreset('custom') }}
                                >
                                    All
                                </button>
                                {DIFFICULTY_CHIPS.map((opt) => {
                                    const active = selectedDifficulties.has(opt.value)
                                    const count = interactiveQuestions.filter((q) =>
                                        typeof q?.subtype === 'string' && q.subtype.startsWith('interactive_numerical') &&
                                        getQuestionDifficulty(q) === opt.value && selectedTypes.has(q.type)
                                    ).length
                                    return (
                                        <button
                                            key={opt.value}
                                            className={`test-setup__time-btn ${active ? 'test-setup__time-btn--active' : ''}`}
                                            onClick={() => toggleChip(selectedDifficulties, setSelectedDifficulties, ALL_DIFFICULTY_VALUES, opt.value)}
                                        >
                                            {opt.label} ({count})
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {availableQuestions.length} questions available for {difficultyLabel}.
                            </p>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Question Type <span className="text-xs font-normal text-slate-400">(multi-select)</span></h3>
                            <div className="test-setup__time-options" style={{ flexWrap: 'wrap' }}>
                                <button
                                    className={`test-setup__time-btn ${allTypesSelected ? 'test-setup__time-btn--active' : ''}`}
                                    onClick={() => { setSelectedTypes(new Set(ALL_TYPE_VALUES)); setSessionPreset('custom') }}
                                    disabled={isRealPreset}
                                >
                                    All
                                </button>
                                {TYPE_CHIPS.map((opt) => {
                                    const active = selectedTypes.has(opt.value)
                                    const count = interactiveQuestions.filter((q) =>
                                        typeof q?.subtype === 'string' && q.subtype.startsWith('interactive_numerical') &&
                                        q.type === opt.value && selectedDifficulties.has(getQuestionDifficulty(q))
                                    ).length
                                    return (
                                        <button
                                            key={opt.value}
                                            className={`test-setup__time-btn ${active ? 'test-setup__time-btn--active' : ''}`}
                                            onClick={() => toggleChip(selectedTypes, setSelectedTypes, ALL_TYPE_VALUES, opt.value)}
                                            disabled={isRealPreset || count === 0}
                                        >
                                            {opt.label} ({count})
                                        </button>
                                    )
                                })}
                            </div>
                            {isRealPreset && (
                                <p className="text-xs text-slate-400 mt-1">Type filter disabled in SHL Real preset (uses balanced mix).</p>
                            )}
                        </div>

                        <div className="test-setup__mode">
                            <h3>Question Count</h3>
                            <div className="test-setup__time-options">
                                {QUESTION_OPTIONS.map((count) => (
                                    <button
                                        key={count}
                                        className={`test-setup__time-btn ${effectiveQuestionCount === count && effectiveQuestionCount < availableQuestions.length ? 'test-setup__time-btn--active' : ''}`}
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
                                    className={`test-setup__time-btn ${effectiveQuestionCount >= availableQuestions.length ? 'test-setup__time-btn--active' : ''}`}
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
                                        className={`test-setup__time-btn ${effectiveTimeLimitMinutes === minutes ? 'test-setup__time-btn--active' : ''}`}
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
                                <Hand className="text-sky-600 shrink-0" size={18} />
                                <h3 className="font-bold text-sky-900">Interaction Modes</h3>
                            </div>
                            <ul className="text-sm text-sky-800 space-y-2 list-disc list-inside">
                                <li>Select a person/store tab then click the answer button (SHL style).</li>
                                <li>Resize pie allocations by increment controls.</li>
                                <li>Adjust stacked-bar total and internal split.</li>
                                <li>Approve or reject each tabbed expense request.</li>
                                <li>Drag daily points on a numeric line graph.</li>
                                <li>{isExamMode ? 'Timed under exam pressure.' : 'Practice with immediate correctness.'}</li>
                            </ul>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-8">
                            <div className="text-sm text-amber-800">
                                <strong className="block mb-1">Session Summary</strong>
                                {isRealPreset
                                    ? `${effectiveQuestionCount} questions in ${effectiveTimeLimitMinutes} minutes (SHL-style real attempt).`
                                    : `${effectiveQuestionCount} questions${isExamMode ? ` in ${effectiveTimeLimitMinutes} minutes.` : ' in untimed practice mode.'}`}
                            </div>
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
                    moduleName={`NLNG Interactive Numerical (${difficultyLabel}, ${effectiveMode}, ${activeQuestions.length}Q${isExamMode ? ` / ${effectiveTimeLimitMinutes}m` : ''})`}
                    mode={effectiveMode}
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
