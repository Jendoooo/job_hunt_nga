import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Timer from '../components/Timer'
import QuestionCard from '../components/QuestionCard'
import QuestionNav from '../components/QuestionNav'
import ScoreReport from '../components/ScoreReport'
import AIExplainer from '../components/AIExplainer'
import practiceQuestions from '../data/saville-practice-questions.json'
import {
    Wrench, ArrowLeft, BookOpen, Timer as TimerIcon,
    Play, Settings
} from 'lucide-react'

export default function SavillePractice() {
    const navigate = useNavigate()
    const [stage, setStage] = useState('setup')
    const [mode, setMode] = useState('practice')
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState([])
    const [showExplanation, setShowExplanation] = useState({})
    const startTimeRef = useRef(null)
    const [timeTaken, setTimeTaken] = useState(0)

    // In a real app, we might shuffle or pick a subset
    const questions = practiceQuestions

    function startTest() {
        setStage('test')
        setCurrentQuestion(0)
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
                            Focus on calculation-heavy process engineering problems similar to Saville assessments.
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
                                    <span className="test-setup__mode-desc">See detailed worked solutions</span>
                                </button>
                                <button
                                    className={`test-setup__mode-btn ${mode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                                    onClick={() => setMode('exam')}
                                >
                                    <TimerIcon className={`mb-2 ${mode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                    <span className="test-setup__mode-label">Timed Mode</span>
                                    <span className="test-setup__mode-desc">30 min limit, exam conditions</span>
                                </button>
                            </div>
                        </div>

                        <button
                            className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
                            onClick={startTest}
                        >
                            <Play size={20} fill="currentColor" /> Start Practice ({questions.length} Qs)
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
                    questions={questions}
                    answers={answers}
                    flagged={flagged}
                    timeTaken={timeTaken}
                    totalTime={mode === 'exam' ? 1800 : 0}
                    assessmentType="saville-practice"
                    moduleName="Detailed Calculation Practice"
                    mode={mode}
                    onRetry={() => setStage('setup')}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const q = questions[currentQuestion]

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
                    {mode === 'exam' && (
                        <Timer
                            duration={1800}
                            onTimeUp={handleTimeUp}
                        />
                    )}
                    <button className="btn btn--danger btn--sm" onClick={finishTest}>
                        End Session
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
                        onToggleFlag={() => {
                            setFlagged(prev => prev.includes(currentQuestion)
                                ? prev.filter(i => i !== currentQuestion)
                                : [...prev, currentQuestion])
                        }}
                    />

                    {mode === 'practice' && showExplanation[currentQuestion] && (
                        <AIExplainer question={q} />
                    )}

                    <div className="test-page__nav-buttons">
                        <button
                            className="btn btn--secondary"
                            onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))}
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
                                onClick={() => setCurrentQuestion(p => p + 1)}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                className="btn btn--primary"
                                onClick={finishTest}
                            >
                                Finish
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
