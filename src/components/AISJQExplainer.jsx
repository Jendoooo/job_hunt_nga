import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { explainSJQAttempt } from '../services/deepseek'
import { Sparkles, X, Bot } from 'lucide-react'

/* ── localStorage explanation cache ─────────────────────── */
const CACHE_KEY = 'jobhunt_ai_sjq_cache_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const CACHE_MAX = 50

function readCache() {
    try { const r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}
function writeCache(c) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch { /* quota */ }
}
function pruneCache(cache) {
    const now = Date.now()
    return Object.fromEntries(
        Object.entries(cache)
            .filter(([, v]) => v && typeof v.t === 'number' && now - v.t <= CACHE_TTL_MS)
            .sort((a, b) => b[1].t - a[1].t)
            .slice(0, CACHE_MAX)
    )
}
function fingerprint(q, ans) {
    // Stable key: question id + user's chosen answer
    const id = q?.id || (q?.scenario || '').trim().slice(0, 80)
    const a = typeof ans === 'number' ? ans : JSON.stringify(ans ?? '').slice(0, 40)
    return `sjq|${id}|${a}`
}
function getCached(fp) {
    const c = pruneCache(readCache()); writeCache(c)
    return c[fp]?.v || null
}
function setCached(fp, value) {
    const c = pruneCache(readCache()); c[fp] = { v: value, t: Date.now() }; writeCache(c)
}
/* ──────────────────────────────────────────────────────── */

function normalizeModelOutput(value) {
    if (!value) return ''

    return String(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<[^>]+>/g, '')
        .trim()
}

export default function AISJQExplainer({ question, answer }) {
    const fp = useMemo(() => fingerprint(question, answer), [question, answer])
    const [explanation, setExplanation] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isOpen, setIsOpen] = useState(false)

    // Reset state when question changes — restore from cache if available
    useEffect(() => {
        const cached = getCached(fp)
        setExplanation(cached)
        setLoading(false)
        setError(null)
        setIsOpen(false)
    }, [fp])

    async function handleExplain() {
        if (explanation) {
            setIsOpen(!isOpen)
            return
        }

        setLoading(true)
        setError(null)
        setIsOpen(true)

        try {
            const result = await explainSJQAttempt(question, answer)
            setExplanation(result)
            setCached(fp, result)
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
                        <p>Analyzing responses...</p>
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
                            {normalizeModelOutput(explanation)}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </section>
    )
}

