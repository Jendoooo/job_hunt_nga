import { useState } from 'react'
import { explainAnswer } from '../services/deepseek'

export default function AIExplainer({ question }) {
    const [explanation, setExplanation] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isOpen, setIsOpen] = useState(false)

    async function handleExplain() {
        if (explanation) {
            setIsOpen(!isOpen)
            return
        }

        setLoading(true)
        setError(null)
        setIsOpen(true)

        try {
            const result = await explainAnswer(
                question.question,
                question.options,
                question.options[question.correctAnswer],
                question.explanation || ''
            )
            setExplanation(result)
        } catch (err) {
            setError('Failed to get AI explanation. Please try again.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="ai-explainer">
            <button
                className="ai-explainer__btn"
                onClick={handleExplain}
                disabled={loading}
            >
                {loading ? (
                    <>
                        <span className="ai-explainer__spinner"></span>
                        AI is thinking...
                    </>
                ) : (
                    <>
                        🤖 {explanation ? (isOpen ? 'Hide' : 'Show') + ' AI Explanation' : 'Explain with AI'}
                    </>
                )}
            </button>

            {isOpen && (
                <div className="ai-explainer__content">
                    {error ? (
                        <div className="ai-explainer__error">{error}</div>
                    ) : explanation ? (
                        <div className="ai-explainer__text">
                            {explanation.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
