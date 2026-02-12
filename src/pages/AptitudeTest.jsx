import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import ScoreReport from '../components/ScoreReport'
import aptitudeQuestions from '../data/aptitude-questions.json'
import { selectUniqueSessionQuestions } from '../utils/questionSession'
import {
    Brain,
    ArrowLeft,
    BookOpen,
    Binary,
    LayoutGrid,
    AlertCircle,
    CheckCircle2,
    Play,
    Timer as TimerIcon,
} from 'lucide-react'

const SUBTESTS = [
    { key: 'verbal', name: 'Verbal Reasoning', icon: BookOpen, color: '#3b82f6' },
    { key: 'numerical', name: 'Numerical Reasoning', icon: Binary, color: '#8b5cf6' },
    { key: 'diagrammatic', name: 'Diagrammatic Reasoning', icon: LayoutGrid, color: '#10b981' },
]

const QUESTION_OPTIONS = [8, 10, 15, 20]
const TIME_OPTIONS_MINUTES = [4, 6, 8, 10]
const DEFAULT_QUESTIONS = 10
const DEFAULT_TIME_MINUTES = 6

export default function AptitudeTest() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [mode, setMode] = useState('exam')
    const [questionsPerSubtest, setQuestionsPerSubtest] = useState(DEFAULT_QUESTIONS)
    const [minutesPerSubtest, setMinutesPerSubtest] = useState(DEFAULT_TIME_MINUTES)
    const [sessionQuestions, setSessionQuestions] = useState({})
    const [currentSubtestIndex, setCurrentSubtestIndex] = useState(0)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [sectionTimeLeft, setSectionTimeLeft] = useState(0)
    const [timeTaken, setTimeTaken] = useState(0)
    const startTimeRef = useRef(null)

    const currentSubtest = SUBTESTS[currentSubtestIndex]
    const sectionDurationSeconds = minutesPerSubtest * 60
    const totalTimeSeconds = SUBTESTS.length * sectionDurationSeconds
    const isExamMode = mode === 'exam'

    const subtestQuestions = useMemo(
        () => sessionQuestions[currentSubtest?.key] || [],
        [sessionQuestions, currentSubtest]
    )

    function startTest() {
        const nextSessionQuestions = SUBTESTS.reduce((accumulator, subtest) => {
            const pool = aptitudeQuestions.filter((question) => question.subtest === subtest.key)
            accumulator[subtest.key] = selectUniqueSessionQuestions(pool, questionsPerSubtest)
            return accumulator
        }, {})

        setSessionQuestions(nextSessionQuestions)
        setAnswers({})
        setFlagged([])
        setTimeTaken(0)
        setCurrentSubtestIndex(0)
        setCurrentQuestionIndex(0)
        setSectionTimeLeft(sectionDurationSeconds)
        setStage('test')
        startTimeRef.current = Date.now()
    }

    function completeAssessment() {
        const elapsed = startTimeRef.current
            ? Math.round((Date.now() - startTimeRef.current) / 1000)
            : totalTimeSeconds

        setTimeTaken(elapsed)
        setStage('finish')
    }

    function finishSubtest() {
        if (currentSubtestIndex < SUBTESTS.length - 1) {
            setStage('break')
            return
        }
        completeAssessment()
    }

    function nextSubtest() {
        const nextIndex = currentSubtestIndex + 1
        setCurrentSubtestIndex(nextIndex)
        setCurrentQuestionIndex(0)
        setSectionTimeLeft(sectionDurationSeconds)
        setStage('test')
    }

    function handleAnswer(answerIndex) {
        const key = `${currentSubtest.key}-${currentQuestionIndex}`
        setAnswers((prev) => ({ ...prev, [key]: answerIndex }))
    }

    if (stage === 'setup') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <Brain className="text-purple-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Swift Analysis Aptitude</h1>
                    </div>
                </header>

                <div className="test-setup">
                    <div className="test-setup__card">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Aptitude Session</h2>
                        <p className="test-setup__description">
                            Run this module in timed exam mode or guided practice mode with instant answer feedback.
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
                                    <span className="test-setup__mode-desc">Timed sections, no instant correctness</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('practice')}
                                >
                                    <BookOpen className={`mb-2 ${mode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Practice Mode</span>
                                    <span className="test-setup__mode-desc">Untimed flow with immediate feedback</span>
                                </button>
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Questions Per Subtest</h3>
                            <div className="test-setup__time-options">
                                {QUESTION_OPTIONS.map((count) => (
                                    <button
                                        key={count}
                                        className={`test-setup__time-btn ${questionsPerSubtest === count ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => setQuestionsPerSubtest(count)}
                                    >
                                        {count} Qs
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="test-setup__mode">
                            <h3>Time Per Subtest (Exam)</h3>
                            <div className="test-setup__time-options">
                                {TIME_OPTIONS_MINUTES.map((minutes) => (
                                    <button
                                        key={minutes}
                                        className={`test-setup__time-btn ${minutesPerSubtest === minutes ? 'test-setup__time-btn--active' : ''}`}
                                        onClick={() => setMinutesPerSubtest(minutes)}
                                    >
                                        {minutes} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {SUBTESTS.map((subtest) => (
                                <div key={subtest.key} className="p-6 rounded-xl border border-slate-100 bg-slate-50 text-center">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-slate-700">
                                        <subtest.icon size={24} color={subtest.color} />
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-1">{subtest.name}</h3>
                                    <p className="text-sm text-slate-500">
                                        {questionsPerSubtest} questions
                                        {isExamMode ? ` | ${minutesPerSubtest} minutes` : ' | untimed'}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-2 flex items-start gap-4">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-bold text-amber-900 mb-2">Session Summary</h3>
                                <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
                                    <li>{questionsPerSubtest * SUBTESTS.length} total questions.</li>
                                    <li>{isExamMode ? `${minutesPerSubtest * SUBTESTS.length} total timed minutes.` : 'No timer in practice mode.'}</li>
                                    <li>You cannot return to a completed section.</li>
                                </ul>
                            </div>
                        </div>

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startTest}
                        >
                            <Play size={18} /> Start {isExamMode ? 'Assessment' : 'Practice'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (stage === 'break') {
        const nextSubtestData = SUBTESTS[currentSubtestIndex + 1]

        return (
            <div className="test-page flex items-center justify-center">
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{currentSubtest.name} Complete</h2>
                    <p className="text-slate-500 mb-8">Take a short pause. Start the next section when ready.</p>

                    <div className="bg-slate-50 p-4 rounded-lg mb-8">
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Up Next</span>
                        <div className="flex items-center justify-center gap-2 text-lg font-bold text-slate-800">
                            <nextSubtestData.icon size={20} color={nextSubtestData.color} />
                            {nextSubtestData.name}
                        </div>
                        <span className="text-sm text-slate-500">{isExamMode ? `${minutesPerSubtest} minutes` : 'Untimed'}</span>
                    </div>

                    <button className="btn btn--primary btn--full" onClick={nextSubtest}>
                        Start Next Section
                    </button>
                </div>
            </div>
        )
    }

    if (stage === 'finish') {
        const flatQuestions = SUBTESTS.flatMap((subtest) => sessionQuestions[subtest.key] || [])
        const flatAnswers = {}
        let offset = 0

        SUBTESTS.forEach((subtest) => {
            const subtestItems = sessionQuestions[subtest.key] || []
            subtestItems.forEach((_, questionIndex) => {
                const key = `${subtest.key}-${questionIndex}`
                if (answers[key] !== undefined) {
                    flatAnswers[offset + questionIndex] = answers[key]
                }
            })
            offset += subtestItems.length
        })

        return (
            <div className="test-page">
                <header className="test-page__header">
                    <div className="flex items-center gap-2">
                        <Brain className="text-purple-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Swift Analysis Aptitude - Results</h1>
                    </div>
                </header>
                <ScoreReport
                    questions={flatQuestions}
                    answers={flatAnswers}
                    flagged={flagged}
                    timeTaken={timeTaken || (isExamMode ? totalTimeSeconds : 0)}
                    totalTime={isExamMode ? totalTimeSeconds : 0}
                    assessmentType="saville-aptitude"
                    moduleName={`Swift Analysis Aptitude (${mode}, ${questionsPerSubtest}Q x ${SUBTESTS.length}${isExamMode ? ` / ${minutesPerSubtest}m each` : ''})`}
                    mode={mode}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const question = subtestQuestions[currentQuestionIndex]
    const answerKey = `${currentSubtest.key}-${currentQuestionIndex}`
    const selected = answers[answerKey]

    if (!question) {
        return null
    }

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                        style={{ background: currentSubtest.color }}
                    >
                        <currentSubtest.icon size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">{currentSubtest.name}</h2>
                        <div className="test-page__subtest-progress">
                            Question {currentQuestionIndex + 1} of {subtestQuestions.length}
                        </div>
                    </div>
                </div>

                <div className="test-page__header-right">
                    {isExamMode ? (
                        <Timer duration={sectionTimeLeft} onTimeUp={finishSubtest} />
                    ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            Practice Mode
                        </span>
                    )}
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-4 sm:p-8">
                <QuestionCard
                    question={question}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={subtestQuestions.length}
                    selectedAnswer={selected}
                    onSelectAnswer={handleAnswer}
                    showResult={!isExamMode && selected !== undefined}
                    correctAnswer={question.correctAnswer}
                />

                <div className="flex justify-between mt-8">
                    <button
                        className="btn btn--secondary"
                        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                    >
                        <ArrowLeft size={16} /> Previous
                    </button>

                    <button
                        className="btn btn--primary"
                        onClick={() => {
                            if (currentQuestionIndex < subtestQuestions.length - 1) {
                                setCurrentQuestionIndex((prev) => prev + 1)
                                return
                            }
                            finishSubtest()
                        }}
                    >
                        {currentQuestionIndex < subtestQuestions.length - 1 ? 'Next Question' : 'Finish Section'}
                    </button>
                </div>
            </div>
        </div>
    )
}
