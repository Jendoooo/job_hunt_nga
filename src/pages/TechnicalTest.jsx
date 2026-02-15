import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import AIExplainer from '../components/AIExplainer'
import technicalQuestions from '../data/technical-questions.json'
import { dedupeQuestionsByContent, selectUniqueSessionQuestions } from '../utils/questionSession'
import { earlySaveAttempt } from '../utils/earlySave'
import { useAuth } from '../context/useAuth'
import {
    Settings,
    ArrowLeft,
    Timer as TimerIcon,
    BookOpen,
    CheckCircle2,
    Play,
    Circle,
} from 'lucide-react'

const SECTIONS = [
    { key: 'vle', name: 'VLE and Phase Behavior', color: '#3b82f6' },
    { key: 'equipment', name: 'Equipment Selection and Sizing', color: '#8b5cf6' },
    { key: 'pid', name: 'P and ID Interpretation', color: '#10b981' },
    { key: 'safety', name: 'Process Safety', color: '#f59e0b' },
    { key: 'fundamentals', name: 'Process Fundamentals', color: '#ef4444' },
]

export default function TechnicalTest() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const attemptIdRef = useRef(null)
    const [stage, setStage] = useState('setup')
    const [mode, setMode] = useState('practice')
    const [selectedSections, setSelectedSections] = useState(SECTIONS.map((section) => section.key))
    const [examTime, setExamTime] = useState(90)
    const [questionCount, setQuestionCount] = useState(40)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [showExplanation, setShowExplanation] = useState({})
    const [activeQuestions, setActiveQuestions] = useState([])
    const [timeTaken, setTimeTaken] = useState(0)
    const startTimeRef = useRef(null)

    const availableQuestions = technicalQuestions.filter((question) =>
        selectedSections.includes(question.section)
    )

    const selectedSectionNames = SECTIONS
        .filter((section) => selectedSections.includes(section.key))
        .map((section) => section.name)
        .join(', ')

    function toggleSection(sectionKey) {
        setSelectedSections((prev) =>
            prev.includes(sectionKey)
                ? prev.filter((key) => key !== sectionKey)
                : [...prev, sectionKey]
        )
    }

    function startTest() {
        if (availableQuestions.length === 0) return

        const uniqueAvailable = dedupeQuestionsByContent(availableQuestions)
        let questionsToUse = [...uniqueAvailable]
        if (mode === 'exam') {
            questionsToUse = selectUniqueSessionQuestions(uniqueAvailable, questionCount)
        }

        setActiveQuestions(questionsToUse)
        setStage('test')
        setCurrentQuestion(0)
        setAnswers({})
        setFlagged([])
        setShowExplanation({})
        setTimeTaken(0)
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

        if (user && activeQuestions.length > 0) {
            if (!attemptIdRef.current) attemptIdRef.current = crypto.randomUUID()
            earlySaveAttempt({
                attemptId: attemptIdRef.current,
                user,
                questions: activeQuestions,
                answers,
                assessmentType: 'totalenergies-technical',
                moduleName: selectedSectionNames,
                elapsed,
                mode,
            })
        }

        setStage('review')
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
                        <Settings className="text-blue-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Technical Assessment</h1>
                    </div>
                </header>

                <div className="test-setup">
                    <div className="test-setup__card">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Test Session</h2>
                        <p className="test-setup__description">
                            Build a custom technical run in practice mode, or simulate a timed exam environment.
                        </p>

                        <div className="test-setup__mode">
                            <h3>Test Mode</h3>
                            <div className="test-setup__mode-options">
                                <button
                                    className={`test-setup__mode-btn ${mode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('practice')}
                                >
                                    <BookOpen className={`mb-2 ${mode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Practice Mode</span>
                                    <span className="test-setup__mode-desc">Untimed with explanations</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('exam')}
                                >
                                    <TimerIcon className={`mb-2 ${mode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Exam Mode</span>
                                    <span className="test-setup__mode-desc">Timed without live explanations</span>
                                </button>
                            </div>
                        </div>

                        {mode === 'exam' && (
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="test-setup__time">
                                    <h3>Time Limit</h3>
                                    <div className="test-setup__time-options">
                                        {[30, 60, 90, 120].map((minutes) => (
                                            <button
                                                key={minutes}
                                                className={`test-setup__time-btn ${examTime === minutes ? 'test-setup__time-btn--active' : ''}`}
                                                onClick={() => setExamTime(minutes)}
                                            >
                                                {minutes} min
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="test-setup__count">
                                    <h3>Question Count</h3>
                                    <div className="test-setup__time-options">
                                        {[20, 40, 60, 100].map((count) => (
                                            <button
                                                key={count}
                                                className={`test-setup__time-btn ${questionCount === count && questionCount < availableQuestions.length ? 'test-setup__time-btn--active' : ''}`}
                                                onClick={() => setQuestionCount(count)}
                                                disabled={count > availableQuestions.length}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                        <button
                                            key="all"
                                            className={`test-setup__time-btn ${questionCount >= availableQuestions.length ? 'test-setup__time-btn--active' : ''}`}
                                            onClick={() => setQuestionCount(availableQuestions.length)}
                                        >
                                            All ({availableQuestions.length})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="test-setup__sections">
                            <h3>Sections ({availableQuestions.length} matching questions)</h3>
                            <div className="test-setup__section-grid">
                                {SECTIONS.map((section) => {
                                    const count = technicalQuestions.filter((question) => question.section === section.key).length
                                    const isSelected = selectedSections.includes(section.key)

                                    return (
                                        <button
                                            key={section.key}
                                            className={`test-setup__section-btn ${isSelected ? 'test-setup__section-btn--active' : ''}`}
                                            onClick={() => toggleSection(section.key)}
                                            style={{ '--section-color': section.color }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isSelected ? (
                                                    <CheckCircle2 size={16} color={section.color} fill={`${section.color}20`} />
                                                ) : (
                                                    <Circle size={16} className="text-slate-300" />
                                                )}
                                                <span className={`test-setup__section-name ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                                                    {section.name}
                                                </span>
                                            </div>
                                            <span className="test-setup__section-count">{count} Qs</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startTest}
                            disabled={availableQuestions.length === 0}
                        >
                            <Play size={20} fill="currentColor" />
                            {mode === 'exam'
                                ? `Start Timed Test (${questionCount} Qs)`
                                : `Start Practice (${availableQuestions.length} Qs)`}
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
                        <Settings className="text-blue-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Technical Assessment Results</h1>
                    </div>
                </header>
                <ScoreReport
                    questions={activeQuestions}
                    answers={answers}
                    flagged={flagged}
                    timeTaken={timeTaken}
                    totalTime={mode === 'exam' ? examTime * 60 : 0}
                    assessmentType="totalenergies-technical"
                    moduleName={selectedSectionNames}
                    mode={mode}
                    attemptId={attemptIdRef.current}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const question = activeQuestions[currentQuestion]
    if (!question) return null

    const currentSection = SECTIONS.find((section) => section.key === question.section)

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <h2 className="text-sm font-bold text-slate-800 hidden sm:block">Technical Assessment</h2>
                    <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ background: currentSection?.color || '#3b82f6' }}
                    >
                        {currentSection?.name || 'General'}
                    </span>
                </div>

                <div className="test-page__header-right">
                    {mode === 'exam' && (
                        <div className="flex items-center gap-2">
                            <TimerIcon size={16} className="text-slate-500" />
                            <Timer
                                duration={examTime * 60}
                                onTimeUp={finishTest}
                            />
                        </div>
                    )}
                    <button className="btn btn--danger btn--sm" onClick={finishTest}>
                        Finish Test
                    </button>
                </div>
            </header>

            <div className="test-page__body">
                <div className="test-page__sidebar hidden lg:block">
                    <QuestionNav
                        totalQuestions={activeQuestions.length}
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
                            totalQuestions={activeQuestions.length}
                            selectedAnswer={answers[currentQuestion]}
                            onSelectAnswer={handleAnswer}
                            showResult={mode === 'practice' && showExplanation[currentQuestion]}
                            correctAnswer={question.correctAnswer}
                            isFlagged={flagged.includes(currentQuestion)}
                            onToggleFlag={toggleFlag}
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

                            {currentQuestion < activeQuestions.length - 1 ? (
                                <button
                                    className="btn btn--primary"
                                    onClick={() => setCurrentQuestion((prev) => prev + 1)}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    className="btn btn--primary"
                                    onClick={finishTest}
                                >
                                    Submit
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
