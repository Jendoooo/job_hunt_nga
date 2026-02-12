import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard'
import ScoreReport from '../components/ScoreReport'
import { Sparkles, ArrowLeft, Bot } from 'lucide-react'

export default function AIGeneratedTest() {
    const navigate = useNavigate()
    const [sessionPayload] = useState(() => {
        const storedQs = sessionStorage.getItem('ai_questions')
        const storedTopic = sessionStorage.getItem('ai_topic')

        if (!storedQs) {
            return { questions: [], topic: '', isValid: false }
        }

        try {
            return {
                questions: JSON.parse(storedQs),
                topic: storedTopic || 'Custom Topic',
                isValid: true,
            }
        } catch (error) {
            console.error('Failed to parse AI questions:', error)
            return { questions: [], topic: '', isValid: false }
        }
    })
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState({})
    const [finished, setFinished] = useState(false)

    const { questions, topic, isValid } = sessionPayload

    useEffect(() => {
        if (!isValid || questions.length === 0) {
            navigate('/')
        }
    }, [isValid, questions.length, navigate])

    if (questions.length === 0) return (
        <div className="flex items-center justify-center min-h-screen text-slate-500">
            <span className="flex items-center gap-2">
                <Sparkles className="animate-pulse" /> Loading assessment...
            </span>
        </div>
    )

    function handleAnswer(answerIndex) {
        setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }))
    }

    function handleNext() {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1)
        } else {
            finishTest()
        }
    }

    function finishTest() {
        // Calculate score locally since we don't have a backend record for this simple test yet
        setFinished(true)
    }

    if (finished) {
        return (
            <div className="test-page">
                <header className="test-page__header">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-purple-600" size={20} />
                        <h1 className="text-lg font-bold text-slate-800">AI Assessment Results</h1>
                    </div>
                </header>

                <ScoreReport
                    questions={questions}
                    answers={answers}
                    flagged={[]}
                    timeTaken={0}
                    totalTime={0}
                    assessmentType="ai-generated"
                    moduleName={`AI: ${topic}`}
                    mode="practice"
                    onRetry={() => {
                        setFinished(false)
                        setCurrentQuestion(0)
                        setAnswers({})
                    }}
                    onBackToDashboard={() => navigate('/')}
                />
            </div>
        )
    }

    const q = questions[currentQuestion]

    return (
        <div className="test-page">
            <header className="test-page__header">
                <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
                    <ArrowLeft size={18} /> Exit
                </button>
                <div className="flex items-center gap-2">
                    <Bot className="text-purple-600" size={20} />
                    <h1 className="text-lg font-bold text-slate-800">AI Assessment: <span className="text-purple-600">{topic}</span></h1>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-4 sm:p-8">
                <QuestionCard
                    question={q}
                    questionNumber={currentQuestion + 1}
                    totalQuestions={questions.length}
                    selectedAnswer={answers[currentQuestion]}
                    onSelectAnswer={handleAnswer}
                    showResult={answers[currentQuestion] !== undefined} // Show immediate feedback for AI practice
                    correctAnswer={q.correctAnswer}
                />

                <div className="flex justify-end mt-8">
                    <button
                        className="btn btn--primary flex items-center gap-2"
                        onClick={handleNext}
                        disabled={answers[currentQuestion] === undefined}
                    >
                        {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Test'}
                    </button>
                </div>
            </div>
        </div>
    )
}
