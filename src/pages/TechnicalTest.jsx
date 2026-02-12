import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import AIExplainer from '../components/AIExplainer'
import technicalQuestions from '../data/technical-questions.json'
import {
    Settings, ArrowLeft, Timer as TimerIcon, BookOpen,
    CheckCircle2, Play, Circle, AlertTriangle
} from 'lucide-react'

const SECTIONS = [
    { key: 'vle', name: 'VLE & Phase Behavior', color: '#3b82f6' },
    { key: 'equipment', name: 'Equipment Selection & Sizing', color: '#8b5cf6' },
    { key: 'pid', name: 'P&ID Interpretation', color: '#10b981' },
    { key: 'safety', name: 'Process Safety', color: '#f59e0b' },
    { key: 'fundamentals', name: 'Process Fundamentals', color: '#ef4444' },
]

export default function TechnicalTest() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup') // setup, test, review
    const [mode, setMode] = useState('practice') // practice or exam
    const [selectedSections, setSelectedSections] = useState(SECTIONS.map(s => s.key))
    const [examTime, setExamTime] = useState(90) // minutes
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [showExplanation, setShowExplanation] = useState({})
    const startTimeRef = useRef(null)
    const [timeTaken, setTimeTaken] = useState(0)

    // Filter questions based on selected sections
    const questions = technicalQuestions.filter(q => selectedSections.includes(q.section))

    function toggleSection(key) {
        setSelectedSections(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        )
    }

    function startTest() {
        if (questions.length === 0) return
        setStage('test')
        setCurrentQuestion(0)
        setAnswers({})
        setFlagged([])
        setShowExplanation({})
        startTimeRef.current = Date.now()
    }

    function handleAnswer(answerIndex) {
        setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }))

        if (mode === 'practice') {
            setShowExplanation(prev => ({ ...prev, [currentQuestion]: true }))
        }
    }

    function handleTimeUp() {
        finishTest()
    }

    function finishTest() {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setTimeTaken(elapsed)
        setStage('review')
    }

    function toggleFlag() {
        setFlagged(prev =>
            prev.includes(currentQuestion)
                ? prev.filter(i => i !== currentQuestion)
                : [...prev, currentQuestion]
        )
    }

    function nextQuestion() {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1)
        }
    }

    function prevQuestion() {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1)
        }
    }

    // Setup screen
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
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Your Test</h2>
                        <p className="test-setup__description">
                            Customize your practice session or simulate exam conditions for the Technical Assessment.
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
                                    <span className="test-setup__mode-desc">Untimed • See explanations immediately</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('exam')}
                                >
                                    <TimerIcon className={`mb-2 ${mode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Exam Mode</span>
                                    <span className="test-setup__mode-desc">Timed • No explanations until end</span>
                                </button>
                            </div>
                        </div>

                        {mode === 'exam' && (
                            <div className="test-setup__time">
                                <h3>Time Limit</h3>
                                <div className="test-setup__time-options">
                                    {[30, 60, 90, 120].map(t => (
                                        <button
                                            key={t}
                                            className={`test-setup__time-btn ${examTime === t ? 'test-setup__time-btn--active' : ''}`}
                                            onClick={() => setExamTime(t)}
                                        >
                                            {t} min
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="test-setup__sections">
                            <h3>Sections ({questions.length} questions selected)</h3>
                            <div className="test-setup__section-grid">
                                {SECTIONS.map(s => {
                                    const count = technicalQuestions.filter(q => q.section === s.key).length
                                    const isSelected = selectedSections.includes(s.key)
                                    return (
                                        <button
                                            key={s.key}
                                            className={`test-setup__section-btn ${isSelected ? 'test-setup__section-btn--active' : ''}`}
                                            onClick={() => toggleSection(s.key)}
                                            style={{ '--section-color': s.color }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isSelected ? (
                                                    <CheckCircle2 size={16} color={s.color} fill={s.color + '20'} />
                                                ) : (
                                                    <Circle size={16} className="text-slate-300" />
                                                )}
                                                <span className={`test-setup__section-name ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{s.name}</span>
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
                            disabled={questions.length === 0}
                        >
                            <Play size={20} fill="currentColor" /> Start Test ({questions.length} Questions)
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Review / Score screen
    if (stage === 'review') {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <div className="flex items-center gap-2">
                        <Settings className="text-blue-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">Technical Assessment — Results</h1>
                    </div>
                </header>
                <ScoreReport
                    questions={questions}
                    answers={answers}
                    flagged={flagged}
                    timeTaken={timeTaken}
                    totalTime={mode === 'exam' ? examTime * 60 : 0}
                    assessmentType="totalenergies-technical"
                    moduleName={selectedSections.join(', ')}
                    mode={mode}
                    onRetry={() => { setStage('setup'); }}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    // Test in progress
    const q = questions[currentQuestion]
    const currentSection = SECTIONS.find(s => s.key === q.section)

    return (
        <div className="test-page">
            <header className="test-page__header test-page__header--compact">
                <div className="test-page__header-left">
                    <h2 className="text-sm font-bold text-slate-700 hidden sm:block">Technical Assessment</h2>
                    <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                        style={{ background: currentSection?.color }}
                    >
                        {currentSection?.name}
                    </span>
                </div>
                <div className="test-page__header-right">
                    {mode === 'exam' && (
                        <Timer
                            duration={examTime * 60}
                            onTimeUp={handleTimeUp}
                        />
                    )}
                    <button className="btn btn--danger btn--sm" onClick={finishTest}>
                        Submit Test
                    </button>
                </div>
            </header>

            <div className="test-page__body">
                <div className="test-page__sidebar hidden lg:block">
                    <QuestionNav
                        totalQuestions={questions.length}
                        currentQuestion={currentQuestion}
                        answers={answers}
                        flagged={flagged}
                        onNavigate={setCurrentQuestion}
                    />
                </div>

                <div className="test-page__content">
                    <QuestionCard
                        question={q}
                        questionNumber={currentQuestion + 1}
                        totalQuestions={questions.length}
                        selectedAnswer={answers[currentQuestion]}
                        onSelectAnswer={handleAnswer}
                        showResult={mode === 'practice' && showExplanation[currentQuestion]}
                        correctAnswer={q.correctAnswer}
                        isFlagged={flagged.includes(currentQuestion)}
                        onToggleFlag={toggleFlag}
                    />

                    {mode === 'practice' && showExplanation[currentQuestion] && (
                        <AIExplainer question={q} />
                    )}

                    <div className="test-page__nav-buttons">
                        <button
                            className="btn btn--secondary"
                            onClick={prevQuestion}
                            disabled={currentQuestion === 0}
                        >
                            ← Previous
                        </button>

                        {mode === 'practice' && answers[currentQuestion] !== undefined && !showExplanation[currentQuestion] && (
                            <button
                                className="btn btn--primary"
                                onClick={() => setShowExplanation(prev => ({ ...prev, [currentQuestion]: true }))}
                            >
                                Check Answer
                            </button>
                        )}

                        {currentQuestion < questions.length - 1 ? (
                            <button
                                className="btn btn--primary"
                                onClick={nextQuestion}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                className="btn btn--primary"
                                onClick={finishTest}
                            >
                                Finish Test
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
