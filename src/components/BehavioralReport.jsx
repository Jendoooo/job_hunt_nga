import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, hasSupabaseEnv } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { enqueueAttemptOutbox } from '../utils/attemptOutbox'
import { buildBehavioralProfile } from '../utils/behavioralScoring'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react'

const SAVE_FAILSAFE_MS = 15000
const RECENT_ATTEMPT_CACHE_KEY = 'jobhunt_recent_attempt_fingerprints'
const RECENT_ATTEMPT_TTL_MS = 120000

function isAbortLikeError(error) {
  const message = typeof error?.message === 'string'
    ? error.message.toLowerCase()
    : ''
  return error?.name === 'AbortError' || message.includes('aborted')
}

function createClientAttemptId() {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : null
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  // UUID v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

function normalizeForComparison(value) {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForComparison(item))
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = normalizeForComparison(value[key])
      return accumulator
    }, {})
}

function stableSerialize(value) {
  return JSON.stringify(normalizeForComparison(value))
}

function readRecentAttemptCache() {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.sessionStorage.getItem(RECENT_ATTEMPT_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeRecentAttemptCache(cache) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(RECENT_ATTEMPT_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore.
  }
}

function pruneRecentAttemptCache(cache) {
  const now = Date.now()
  return Object.entries(cache).reduce((accumulator, [key, timestamp]) => {
    if (typeof timestamp === 'number' && now - timestamp <= RECENT_ATTEMPT_TTL_MS) {
      accumulator[key] = timestamp
    }
    return accumulator
  }, {})
}

function isFingerprintRecentlySaved(fingerprint) {
  const cache = pruneRecentAttemptCache(readRecentAttemptCache())
  writeRecentAttemptCache(cache)
  return Boolean(cache[fingerprint])
}

function markFingerprintAsSaved(fingerprint) {
  const cache = pruneRecentAttemptCache(readRecentAttemptCache())
  cache[fingerprint] = Date.now()
  writeRecentAttemptCache(cache)
}

export default function BehavioralReport({
  triplets,
  answers,
  timeTaken,
  totalTime,
  assessmentType,
  moduleName,
  mode,
  onRetry,
  onBackToDashboard,
}) {
  const { user } = useAuth()
  const isMountedRef = useRef(false)
  const autoSaveTriggeredRef = useRef(false)
  const attemptIdRef = useRef(null)
  const attemptCreatedAtRef = useRef(null)

  const [saved, setSaved] = useState(false)
  const [savedLocally, setSavedLocally] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const report = useMemo(() => (
    buildBehavioralProfile(triplets, answers)
  ), [answers, triplets])

  const saveResults = useCallback(async () => {
    if (!user || saved || savedLocally || saving) return saved || savedLocally

    if (isMountedRef.current) {
      setSaving(true)
      setSaveError('')
    }

    if (!attemptIdRef.current) {
      attemptIdRef.current = createClientAttemptId()
    }

    if (!attemptCreatedAtRef.current) {
      attemptCreatedAtRef.current = new Date().toISOString()
    }

    const payload = {
      id: attemptIdRef.current,
      user_id: user.id,
      assessment_type: assessmentType,
      module_name: moduleName,
      // Behavioral profiles are not pass/fail; store completion.
      score: report.answeredCount,
      total_questions: report.totalTriplets,
      time_taken_seconds: timeTaken,
      mode,
      answers: answers || {},
      created_at: attemptCreatedAtRef.current,
    }

    const attemptFingerprint = stableSerialize({
      assessment_type: payload.assessment_type,
      module_name: payload.module_name,
      score: payload.score,
      total_questions: payload.total_questions,
      time_taken_seconds: payload.time_taken_seconds,
      mode: payload.mode,
      answers: payload.answers || {},
    })

    if (isFingerprintRecentlySaved(attemptFingerprint)) {
      window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
      if (isMountedRef.current) {
        setSaved(true)
        setSavedLocally(false)
        setSaving(false)
      }
      return true
    }

    if (!hasSupabaseEnv) {
      enqueueAttemptOutbox(payload)
      markFingerprintAsSaved(attemptFingerprint)
      window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
      if (isMountedRef.current) {
        setSavedLocally(true)
        setSaveError('Supabase is not configured in this environment. Result saved locally.')
        setSaving(false)
      }
      return true
    }

    const controller = new AbortController()
    let failsafeTimerId = null

    try {
      const insertQuery = supabase
        .from('test_attempts')
        .insert(payload)
        .select('*')
        .single()
        .abortSignal(controller.signal)

      const insertPromise = insertQuery.then((res) => res).catch((error) => {
        if (isAbortLikeError(error) || controller.signal.aborted) {
          return { data: null, error: null, status: 'aborted' }
        }
        throw error
      })

      const result = await Promise.race([
        insertPromise,
        new Promise((resolve) => {
          failsafeTimerId = setTimeout(() => {
            controller.abort()
            resolve({ data: null, error: null, status: 'local' })
          }, SAVE_FAILSAFE_MS)
        }),
      ])

      if (result?.status === 'local') {
        enqueueAttemptOutbox(payload)
        markFingerprintAsSaved(attemptFingerprint)
        window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
        if (isMountedRef.current) {
          setSavedLocally(true)
          setSaveError('')
        }
        return true
      }

      const { data, error } = result || {}
      if (error) throw error

      markFingerprintAsSaved(attemptFingerprint)
      window.dispatchEvent(new CustomEvent('attempt-saved', { detail: data || payload }))
      if (isMountedRef.current) {
        setSaved(true)
        setSavedLocally(false)
      }
      return true
    } catch (err) {
      if (isAbortLikeError(err) || controller.signal.aborted) {
        return false
      }

      console.error('Failed to save behavioral report:', err)
      enqueueAttemptOutbox(payload)
      window.dispatchEvent(new CustomEvent('attempt-saved', { detail: payload }))
      if (isMountedRef.current) {
        setSavedLocally(true)
        setSaveError(String(err?.message || 'Unable to save results right now.'))
      }
      return true
    } finally {
      if (failsafeTimerId) clearTimeout(failsafeTimerId)
      controller.abort()
      if (isMountedRef.current) setSaving(false)
    }
  }, [
    answers,
    assessmentType,
    mode,
    moduleName,
    report.answeredCount,
    report.totalTriplets,
    saved,
    savedLocally,
    saving,
    timeTaken,
    user,
  ])

  useEffect(() => {
    if (!user || autoSaveTriggeredRef.current) return
    autoSaveTriggeredRef.current = true
    saveResults()
  }, [saveResults, user])

  return (
    <section className="beh-report">
      <header className="beh-report__hero">
        <div className="beh-report__hero-top">
          <div>
            <h2>Behavioral Profile</h2>
            <p>Forced-choice ranking across 8 competencies (Sten 1-10).</p>
          </div>
          <div className="beh-report__stats">
            <div className="beh-report__stat">
              <Clock size={16} />
              <span>{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</span>
              <p>Time Taken</p>
            </div>
            {totalTime > 0 && (
              <div className="beh-report__stat">
                <Clock size={16} />
                <span>{Math.floor(totalTime / 60)}m</span>
                <p>Time Allowed</p>
              </div>
            )}
            <div className="beh-report__stat">
              <CheckCircle2 size={16} />
              <span>{report.answeredCount}/{report.totalTriplets}</span>
              <p>Blocks Answered</p>
            </div>
          </div>
        </div>

        <div className="beh-report__save-row">
          {saved && (
            <div className="beh-report__saved">
              <Check size={14} />
              Profile saved to your history
            </div>
          )}
          {savedLocally && !saved && (
            <div className="beh-report__saved beh-report__saved--local">
              <Check size={14} />
              Profile saved locally. Cloud sync is pending.
            </div>
          )}
          {saving && (
            <div className="beh-report__saving">Saving your profile...</div>
          )}
          {saveError && (
            <div className="beh-report__save-error">Could not save yet: {saveError}</div>
          )}
        </div>
      </header>

      <article className="beh-report__card">
        <header className="beh-report__card-head">
          <h3>Sten Profile</h3>
          <p>Higher scores indicate the competencies you tended to prioritise more often.</p>
        </header>

        <div className="beh-sten">
          {report.profile.map((item) => (
            <div className="beh-sten__row" key={item.id}>
              <div className="beh-sten__label">{item.label}</div>
              <div className="beh-sten__bar" aria-label={`${item.label} sten ${item.sten} of 10`}>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`beh-sten__tick ${idx < item.sten ? 'beh-sten__tick--on' : ''}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className="beh-sten__value">{item.sten}</div>
            </div>
          ))}
        </div>

        {report.top.length > 0 && (
          <div className="beh-report__top">
            <strong>Top focus areas:</strong>{' '}
            {report.top.map((t) => t.label).join(', ')}.
          </div>
        )}
      </article>

      <footer className="beh-report__actions">
        <button className="btn btn--secondary" onClick={onRetry}>
          <RotateCcw size={16} />
          Retry
        </button>
        <button className="btn btn--ghost" onClick={onBackToDashboard}>
          <ArrowLeft size={16} />
          Dashboard
        </button>
      </footer>
    </section>
  )
}
