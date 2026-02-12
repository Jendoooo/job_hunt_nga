import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { explainAnswer } from '../services/deepseek'
import { Sparkles, X, Bot } from 'lucide-react'

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
            setError('Failed to get AI explanation. Please check your connection.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <div className="ai-explainer">
                <button
                    type="button"
                    className="btn btn--secondary ai-explainer__trigger"
                    onClick={handleExplain}
                >
                    <Sparkles size={16} />
                    Explain With AI
                </button>
            </div>
        )
    }

    return (
        <section className="ai-explainer ai-explainer--open">
            <header className="ai-explainer__header">
                <h4><Bot size={16} /> AI Analysis</h4>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close AI explanation"
                >
                    <X size={16} />
                </button>
            </header>

            <div className="ai-explainer__content">
                {loading && (
                    <div className="ai-explainer__loading">
                        <span className="ai-spinner" aria-hidden="true"></span>
                        <p>Analyzing question structure...</p>
                    </div>
                )}

                {error && (
                    <div className="ai-explainer__error">
                        <p>{error}</p>
                        <button type="button" onClick={handleExplain}>Retry</button>
                    </div>
                )}

                {!loading && !error && explanation && (
                    <div className="ai-explainer__markdown">
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                p: (props) => <p className="ai-explainer__p" {...props} />,
                                ul: (props) => <ul className="ai-explainer__ul" {...props} />,
                                ol: (props) => <ol className="ai-explainer__ol" {...props} />,
                                li: (props) => <li className="ai-explainer__li" {...props} />,
                                code: ({ inline, children, ...props }) => (
                                    <code className={inline ? 'ai-explainer__code' : 'ai-explainer__codeblock'} {...props}>
                                        {children}
                                    </code>
                                ),
                            }}
                        >
                            {explanation}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </section>
    )
}
