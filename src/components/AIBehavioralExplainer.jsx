import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { generateBehavioralProfileNarrative } from '../services/deepseek'
import { Sparkles, X, Bot } from 'lucide-react'

const CACHE_KEY = 'jobhunt_beh_ai_profile_cache_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const CACHE_MAX_ENTRIES = 12

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

function getReportFingerprint(report) {
  const profile = Array.isArray(report?.profile) ? report.profile : []
  const extras = Array.isArray(report?.extras) ? report.extras : []
  const base = [
    `v=1`,
    `a=${Number(report?.answeredCount || 0)}`,
    `t=${Number(report?.totalTriplets || 0)}`,
    `p=${profile.map((p) => `${p.id}:${p.sten}`).join('|')}`,
    `x=${extras.map((p) => `${p.id}:${p.sten}`).join('|')}`,
  ]
  return base.join(';')
}

function readCache() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(cache) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore (quota / private mode).
  }
}

function pruneCache(cache) {
  const now = Date.now()
  const entries = Object.entries(cache || {})
    .filter(([, item]) => item && typeof item === 'object')
    .filter(([, item]) => typeof item.ts === 'number' && typeof item.value === 'string')
    .filter(([, item]) => now - item.ts <= CACHE_TTL_MS)
    .sort((a, b) => b[1].ts - a[1].ts)
    .slice(0, CACHE_MAX_ENTRIES)

  return entries.reduce((acc, [key, item]) => {
    acc[key] = item
    return acc
  }, {})
}

function getCachedNarrative(fingerprint) {
  const cache = pruneCache(readCache())
  writeCache(cache)
  return cache[fingerprint]?.value || null
}

function setCachedNarrative(fingerprint, narrative) {
  const cache = pruneCache(readCache())
  cache[fingerprint] = { value: narrative, ts: Date.now() }
  writeCache(cache)
}

export default function AIBehavioralExplainer({ report }) {
  const [narrative, setNarrative] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const fingerprint = getReportFingerprint(report)
  const cachedNarrative = !narrative ? getCachedNarrative(fingerprint) : null

  async function handleGenerate() {
    if (narrative) {
      setIsOpen(!isOpen)
      return
    }

    if (cachedNarrative) {
      setNarrative(cachedNarrative)
      setIsOpen(true)
      return
    }

    setLoading(true)
    setError(null)
    setIsOpen(true)

    try {
      const result = await generateBehavioralProfileNarrative(report, {
        audience: 'NLNG graduate assessment candidate',
      })
      setNarrative(result)
      setCachedNarrative(fingerprint, result)
    } catch (err) {
      setError('Failed to generate AI profile. Please check your connection / API key.')
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
          onClick={handleGenerate}
        >
          <Sparkles size={16} />
          {cachedNarrative ? 'View AI Profile' : 'Generate AI Profile'}
        </button>
      </div>
    )
  }

  return (
    <section className="ai-explainer ai-explainer--open">
      <header className="ai-explainer__header">
        <h4><Bot size={16} /> AI Profile</h4>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close AI profile"
        >
          <X size={16} />
        </button>
      </header>

      <div className="ai-explainer__content">
        {loading && (
          <div className="ai-explainer__loading">
            <span className="ai-spinner" aria-hidden="true"></span>
            <p>Generating narrative profile...</p>
          </div>
        )}

        {error && (
          <div className="ai-explainer__error">
            <p>{error}</p>
            <button type="button" onClick={handleGenerate}>Retry</button>
          </div>
        )}

        {!loading && !error && narrative && (
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
              {normalizeModelOutput(narrative)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </section>
  )
}
