import { useEffect, useMemo, useRef, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const PICK_CONFIRM_MS = 200
const SAVED_TOAST_MS = 900

function normalizeOptions(data) {
  const options = Array.isArray(data?.options) ? data.options : []
  return options
    .map((opt, index) => ({
      id: String(opt?.id || `opt_${index + 1}`),
      text: String(opt?.text || ''),
      competency: String(opt?.competency || ''),
    }))
    .filter((opt) => opt.id && opt.text)
    .slice(0, 3)
}

function normalizeRanking(value) {
  if (Array.isArray(value) && value.length === 3) {
    const ids = value.map((v) => String(v || '').trim()).filter(Boolean)
    return ids.length === 3 ? ids : null
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.ranking)) return normalizeRanking(value.ranking)
    if (Array.isArray(value.order)) return normalizeRanking(value.order)
    if (Array.isArray(value.ranks)) return normalizeRanking(value.ranks)
  }

  return null
}

export default function SHLBehavioralWidget({ data, value, onAnswer, disabled = false }) {
  const options = useMemo(() => normalizeOptions(data), [data])
  const completedRanking = useMemo(() => normalizeRanking(value), [value])

  const [rank1, setRank1] = useState(null)
  const [rank2, setRank2] = useState(null)
  const [pendingPickId, setPendingPickId] = useState(null)
  const [savedToast, setSavedToast] = useState(false)
  const [finalRevealId, setFinalRevealId] = useState(null)
  const pendingTimerRef = useRef(null)
  const toastTimerRef = useRef(null)
  const saved = Boolean(completedRanking)

  const remainingOptions = useMemo(() => {
    if (!rank1) return options
    return options.filter((opt) => opt.id !== rank1)
  }, [options, rank1])

  useEffect(() => (
    () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  ), [])

  function scheduleConfirm(optionId, fn) {
    setPendingPickId(optionId)
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null
      fn()
      setPendingPickId(null)
    }, PICK_CONFIRM_MS)
  }

  function triggerSavedToast() {
    setSavedToast(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null
      setSavedToast(false)
    }, SAVED_TOAST_MS)
  }

  function handlePick(optionId) {
    if (disabled) return
    if (!optionId) return
    if (pendingPickId) return
    if (finalRevealId) return

    if (saved) {
      // Require explicit reset to change completed answers.
      return
    }

    if (!rank1) {
      scheduleConfirm(optionId, () => setRank1(optionId))
      return
    }

    if (rank1 && !rank2 && optionId !== rank1) {
      scheduleConfirm(optionId, () => {
        setRank2(optionId)
        const remaining = options.find((opt) => opt.id !== rank1 && opt.id !== optionId)
        const rank3 = remaining?.id
        if (!rank3) return
        // Final UX: reveal the remaining (rank 3) card briefly rather than leaving 2 cards on-screen.
        setFinalRevealId(rank3)
        if (onAnswer) onAnswer([rank1, optionId, rank3])
        triggerSavedToast()
      })
    }
  }

  function handleReset() {
    if (disabled) return
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = null
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = null
    setPendingPickId(null)
    setSavedToast(false)
    setFinalRevealId(null)
    setRank1(null)
    setRank2(null)
    if (onAnswer) onAnswer(null)
  }

  const showChange = saved && !pendingPickId
  const prompt = saved || finalRevealId
    ? 'Saved.'
    : rank1
      ? 'Of the remaining two statements, which one describes you best?'
      : 'Select the statement that is MOST like you.'

  const showFullLocked = saved && !rank1 && !rank2
  const stage2Layout = Boolean(rank1) && !showFullLocked
  const renderedOptions = finalRevealId
    ? options.filter((opt) => opt.id === finalRevealId)
    : (showFullLocked ? options : (rank1 ? remainingOptions : options))
  const showRanks = showFullLocked || Boolean(finalRevealId)

  const rankById = saved && completedRanking
    ? completedRanking.reduce((acc, id, idx) => {
      acc[id] = idx + 1
      return acc
    }, {})
    : {}

  return (
    <section className="shl-beh" aria-label="Ipsative behavioral choices">
      <header className="shl-beh__header">
        <p className="shl-beh__prompt">{prompt}</p>
        {showChange && (
          <button
            type="button"
            className="shl-beh__reset"
            onClick={handleReset}
            disabled={disabled}
            title="Change answer"
          >
            <RotateCcw size={14} />
            Change
          </button>
        )}
      </header>

      <AnimatePresence>
        {savedToast && (
          <Motion.div
            className="shl-beh__toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            Saved
          </Motion.div>
        )}
      </AnimatePresence>

      <Motion.div
        className={[
          'shl-beh__cards',
          stage2Layout ? 'shl-beh__cards--stage2' : '',
          pendingPickId ? 'shl-beh__cards--busy' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="list"
        layout
        transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
      >
        <AnimatePresence mode="popLayout">
          {renderedOptions.map((opt) => {
            const rank = showRanks
              ? (showFullLocked ? rankById[opt.id] : (opt.id === finalRevealId ? 3 : null))
              : null
            return (
              <Motion.button
                key={opt.id}
                type="button"
                role="listitem"
                className={[
                  'shl-beh__card',
                  saved ? 'shl-beh__card--locked' : '',
                  pendingPickId === opt.id ? 'shl-beh__card--picked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handlePick(opt.id)}
                disabled={disabled}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {Number.isInteger(rank) && (
                  <span className="shl-beh__rank" aria-label={`Rank ${rank}`}>{rank}</span>
                )}
                <span className="shl-beh__text">{opt.text}</span>
              </Motion.button>
            )
          })}
        </AnimatePresence>
      </Motion.div>
    </section>
  )
}
