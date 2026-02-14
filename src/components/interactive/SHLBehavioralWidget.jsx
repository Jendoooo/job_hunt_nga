import { useEffect, useMemo, useRef, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const PICK_CONFIRM_MS = 200

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
  const pendingTimerRef = useRef(null)
  const completed = Boolean(completedRanking)

  const remainingOptions = useMemo(() => {
    if (!rank1) return options
    return options.filter((opt) => opt.id !== rank1)
  }, [options, rank1])

  useEffect(() => (
    () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
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

  function handlePick(optionId) {
    if (disabled) return
    if (!optionId) return
    if (pendingPickId) return

    if (completed) {
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
        if (onAnswer) onAnswer([rank1, optionId, rank3])
      })
    }
  }

  function handleReset() {
    if (disabled) return
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = null
    setPendingPickId(null)
    setRank1(null)
    setRank2(null)
    if (onAnswer) onAnswer(null)
  }

  const isStage2 = !completed && Boolean(rank1) && !rank2
  const prompt = completed
    ? 'Ranking saved for this block.'
    : rank1
      ? 'Of the remaining two statements, which one describes you best?'
      : 'Select the statement that is MOST like you.'

  const showFullLocked = completed && !rank1 && !rank2
  const renderedOptions = showFullLocked ? options : (rank1 ? remainingOptions : options)

  const rankById = completed && completedRanking
    ? completedRanking.reduce((acc, id, idx) => {
      acc[id] = idx + 1
      return acc
    }, {})
    : {}

  return (
    <section className="shl-beh" aria-label="Ipsative behavioral choices">
      <header className="shl-beh__header">
        <p className="shl-beh__prompt">{prompt}</p>
        {completed && (
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

      <Motion.div
        className={[
          'shl-beh__cards',
          isStage2 ? 'shl-beh__cards--stage2' : '',
          pendingPickId ? 'shl-beh__cards--busy' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="list"
        layout
      >
        <AnimatePresence mode="popLayout">
          {renderedOptions.map((opt) => {
            const rank = completed ? rankById[opt.id] : null
            return (
              <Motion.button
                key={opt.id}
                type="button"
                role="listitem"
                className={[
                  'shl-beh__card',
                  completed ? 'shl-beh__card--locked' : '',
                  pendingPickId === opt.id ? 'shl-beh__card--picked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handlePick(opt.id)}
                disabled={disabled}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
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
