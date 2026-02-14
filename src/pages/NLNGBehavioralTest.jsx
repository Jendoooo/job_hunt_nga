import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import Timer from '../components/Timer'
import BehavioralReport from '../components/BehavioralReport'
import SHLBehavioralWidget from '../components/interactive/SHLBehavioralWidget'
import behavioralBank from '../data/shl-behavioral.json'
import behavioralRealSets from '../data/shl-behavioral-real.json'
import { shuffleQuestions } from '../utils/questionSession'
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Play,
  StopCircle,
  Timer as TimerIcon,
} from 'lucide-react'

const QUESTION_OPTIONS = [12, 20, 32, 40, 50]
const TIME_OPTIONS_MINUTES = [10, 15, 20, 25, 30]
const REAL_PRESET_QUESTION_COUNT = 32
const REAL_PRESET_TIME_MINUTES = 20
const AUTO_ADVANCE_DELAY_MS = 950

function normalizeTriplet(triplet, prefix = '') {
  const baseId = String(triplet?.id || '').trim()
  if (!baseId) return null

  const id = prefix ? `${prefix}_${baseId}` : baseId
  const options = Array.isArray(triplet?.options) ? triplet.options.slice(0, 3) : []
  if (options.length !== 3) return null

  const normalizedOptions = options
    .map((opt, idx) => ({
      id: String(opt?.id || `${id}_${String.fromCharCode(97 + idx)}`),
      text: String(opt?.text || '').trim(),
      competency: String(opt?.competency || '').trim(),
    }))
    .filter((opt) => opt.id && opt.text)

  if (normalizedOptions.length !== 3) return null

  return {
    ...triplet,
    id,
    options: normalizedOptions,
  }
}

function getTripletsFromBank(bank) {
  const triplets = Array.isArray(bank?.triplets) ? bank.triplets : []
  return triplets
    .map((t) => normalizeTriplet(t))
    .filter(Boolean)
}

function getTripletsFromRealSets(realSets) {
  const sets = Array.isArray(realSets) ? realSets : []
  const collected = []

  for (const set of sets) {
    const prefix = String(set?.id || 'real').trim()
    const triplets = Array.isArray(set?.triplets) ? set.triplets : []
    for (const triplet of triplets) {
      const normalized = normalizeTriplet(triplet, prefix)
      if (normalized) collected.push(normalized)
    }
  }

  return collected
}

export default function NLNGBehavioralTest() {
  const navigate = useNavigate()
  const [stage, setStage] = useState('setup')
  const [sessionPreset, setSessionPreset] = useState('real')
  const [mode, setMode] = useState('exam')
  const [questionCount, setQuestionCount] = useState(REAL_PRESET_QUESTION_COUNT)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(REAL_PRESET_TIME_MINUTES)
  const [activeTriplets, setActiveTriplets] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeTaken, setTimeTaken] = useState(0)
  const startTimeRef = useRef(null)
  const autoAdvanceTimerRef = useRef(null)

  function clearAutoAdvanceTimer() {
    if (!autoAdvanceTimerRef.current) return
    clearTimeout(autoAdvanceTimerRef.current)
    autoAdvanceTimerRef.current = null
  }

  const allTriplets = useMemo(() => {
    const base = getTripletsFromBank(behavioralBank)
    const real = getTripletsFromRealSets(behavioralRealSets)
    return [...base, ...real]
  }, [])
  const availableCount = allTriplets.length

  const isRealPreset = sessionPreset === 'real'
  const effectiveMode = isRealPreset ? 'exam' : mode
  const effectiveQuestionCount = Math.min(
    isRealPreset ? REAL_PRESET_QUESTION_COUNT : questionCount,
    availableCount || (isRealPreset ? REAL_PRESET_QUESTION_COUNT : questionCount)
  )
  const effectiveTimeLimitMinutes = isRealPreset ? REAL_PRESET_TIME_MINUTES : timeLimitMinutes
  const totalTimeSeconds = effectiveTimeLimitMinutes * 60
  const isExamMode = effectiveMode === 'exam'

  function applyRealPreset() {
    setSessionPreset('real')
    setMode('exam')
    setQuestionCount(REAL_PRESET_QUESTION_COUNT)
    setTimeLimitMinutes(REAL_PRESET_TIME_MINUTES)
  }

  function applyCustomPreset() {
    setSessionPreset('custom')
  }

  function startTest() {
    clearAutoAdvanceTimer()
    const picked = shuffleQuestions(allTriplets).slice(0, effectiveQuestionCount)
    setActiveTriplets(picked)
    setCurrentIndex(0)
    setAnswers({})
    setTimeTaken(0)
    setStage('test')
    startTimeRef.current = Date.now()
  }

  function finishTest() {
    clearAutoAdvanceTimer()
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : totalTimeSeconds
    setTimeTaken(elapsed)
    setStage('finish')
  }

  function handleAnswer(value) {
    const triplet = activeTriplets[currentIndex]
    if (!triplet) return

    clearAutoAdvanceTimer()
    setAnswers((prev) => {
      const next = { ...prev }
      if (!value) {
        delete next[triplet.id]
        return next
      }
      next[triplet.id] = value
      return next
    })

    const completed = Array.isArray(value) && value.length === 3
    if (!completed) return
    if (stage !== 'test') return
    if (currentIndex >= activeTriplets.length - 1) return

    autoAdvanceTimerRef.current = setTimeout(() => {
      autoAdvanceTimerRef.current = null
      setCurrentIndex((prev) => Math.min(activeTriplets.length - 1, prev + 1))
    }, AUTO_ADVANCE_DELAY_MS)
  }

  const currentTriplet = activeTriplets[currentIndex] || null
  const currentAnswer = currentTriplet ? answers[currentTriplet.id] : null
  const isAnswered = Array.isArray(currentAnswer) && currentAnswer.length === 3

  useEffect(() => (
    () => {
      if (!autoAdvanceTimerRef.current) return
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  ), [])

  function goPrevious() {
    clearAutoAdvanceTimer()
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  function goNext() {
    clearAutoAdvanceTimer()
    setCurrentIndex((prev) => Math.min(activeTriplets.length - 1, prev + 1))
  }

  if (stage === 'setup') {
    return (
      <div className="test-page">
        <header className="test-page__header">
          <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Brain className="text-sky-600" size={20} />
            <h1 className="text-lg font-bold text-slate-800">NLNG Behavioral (OPQ Style)</h1>
          </div>
        </header>

        <div className="test-setup">
          <div className="test-setup__card">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Behavioral Session</h2>
            <p className="test-setup__description">
              Forced-choice (ipsative) blocks. Choose the statement most like you, then choose the best of the remaining two.
            </p>

            <div className="test-setup__mode">
              <h3>Session Preset</h3>
              <div className="test-setup__time-options">
                <button
                  className={`test-setup__time-btn ${sessionPreset === 'real' ? 'test-setup__time-btn--active' : ''}`}
                  onClick={applyRealPreset}
                >
                  OPQ Real (32 blocks / 20m)
                </button>
                <button
                  className={`test-setup__time-btn ${sessionPreset === 'custom' ? 'test-setup__time-btn--active' : ''}`}
                  onClick={applyCustomPreset}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="test-setup__mode">
              <h3>Mode</h3>
              <div className="test-setup__mode-options">
                <button
                  className={`test-setup__mode-btn ${effectiveMode === 'exam' ? 'test-setup__mode-btn--active' : ''}`}
                  onClick={() => setMode('exam')}
                >
                  <TimerIcon className={`mb-2 ${effectiveMode === 'exam' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                  <span className="test-setup__mode-label">Exam Mode</span>
                  <span className="test-setup__mode-desc">Timed, profile generated at the end</span>
                </button>
                <button
                  className={`test-setup__mode-btn ${effectiveMode === 'practice' ? 'test-setup__mode-btn--active' : ''}`}
                  onClick={() => {
                    setMode('practice')
                    setSessionPreset('custom')
                  }}
                  disabled={sessionPreset === 'real'}
                >
                  <BookOpen className={`mb-2 ${effectiveMode === 'practice' ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                  <span className="test-setup__mode-label">Practice Mode</span>
                  <span className="test-setup__mode-desc">Untimed exploration of choices</span>
                </button>
              </div>
            </div>

            <div className="test-setup__mode">
              <h3>Blocks</h3>
              <div className="test-setup__time-options">
                {QUESTION_OPTIONS.map((count) => (
                  <button
                    key={count}
                    className={`test-setup__time-btn ${effectiveQuestionCount === count ? 'test-setup__time-btn--active' : ''}`}
                    onClick={() => {
                      setSessionPreset('custom')
                      setQuestionCount(count)
                    }}
                    disabled={count > availableCount}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {availableCount} blocks available in the bank.
              </p>
            </div>

            <div className="test-setup__mode">
              <h3>Time Limit (Exam)</h3>
              <div className="test-setup__time-options">
                {TIME_OPTIONS_MINUTES.map((minutes) => (
                  <button
                    key={minutes}
                    className={`test-setup__time-btn ${effectiveTimeLimitMinutes === minutes ? 'test-setup__time-btn--active' : ''}`}
                    onClick={() => {
                      setSessionPreset('custom')
                      setTimeLimitMinutes(minutes)
                    }}
                    disabled={sessionPreset === 'real'}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="text-sky-600 shrink-0" size={18} />
                <h3 className="font-bold text-sky-900">How It Works</h3>
              </div>
              <ul className="text-sm text-sky-800 space-y-2 list-disc list-inside">
                <li>Each block shows 3 statements.</li>
                <li>Pick the statement MOST like you.</li>
                <li>Then pick the BEST of the remaining two.</li>
                <li>Your choices build a profile across 8 competencies.</li>
              </ul>
            </div>

            <button
              className="btn btn--primary btn--lg btn--full flex items-center justify-center gap-2"
              onClick={startTest}
              disabled={availableCount === 0}
            >
              <Play size={18} /> Start {isExamMode ? 'Assessment' : 'Practice'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'finish') {
    return (
      <div className="test-page">
        <header className="test-page__header">
          <div className="flex items-center gap-2">
            <Brain className="text-sky-600" size={20} />
            <h1 className="text-lg font-bold text-slate-800">NLNG Behavioral - Report</h1>
          </div>
        </header>
        <BehavioralReport
          triplets={activeTriplets}
          answers={answers}
          timeTaken={timeTaken || (isExamMode ? totalTimeSeconds : 0)}
          totalTime={isExamMode ? totalTimeSeconds : 0}
          assessmentType="nlng-opq"
          moduleName={`NLNG Behavioral OPQ (${effectiveMode}, ${activeTriplets.length} blocks${isExamMode ? ` / ${effectiveTimeLimitMinutes}m` : ''})`}
          mode={effectiveMode}
          onRetry={() => setStage('setup')}
          onBackToDashboard={() => navigate('/')}
        />
      </div>
    )
  }

  if (!currentTriplet) return null

  const answeredBlocks = Object.keys(answers).length
  const progressPct = activeTriplets.length > 0
    ? Math.round((answeredBlocks / activeTriplets.length) * 100)
    : 0

  return (
    <div className="test-page">
      <header className="test-page__header test-page__header--compact">
        <div className="test-page__header-left">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 bg-sky-600">
            <Brain size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Behavioral (OPQ Style)</h2>
            <div className="test-page__subtest-progress">
              Block {currentIndex + 1} of {activeTriplets.length}
            </div>
          </div>
        </div>

        <div className="test-page__header-right">
          {isExamMode ? (
            <div className="flex items-center gap-2">
              <TimerIcon size={16} className="text-slate-500" />
              <Timer duration={totalTimeSeconds} onTimeUp={finishTest} />
            </div>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Practice Mode
            </span>
          )}
          <button className="btn btn--secondary btn--sm flex items-center gap-1" onClick={finishTest}>
            <StopCircle size={14} /> End Test
          </button>
        </div>
      </header>

      <div className="test-page__body test-page__body--single">
        <div className="test-page__content">
          <div className="max-w-3xl mx-auto w-full">
            <div className="shl-beh-progress" aria-label="Session progress">
              <div className="shl-beh-progress__track" aria-hidden="true">
                <span className="shl-beh-progress__fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="shl-beh-progress__meta">
                <span>{progressPct}% complete</span>
                <span>{answeredBlocks}/{activeTriplets.length} answered</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <Motion.div
                key={currentTriplet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
              >
                <SHLBehavioralWidget
                  data={{ options: currentTriplet.options }}
                  value={currentAnswer}
                  onAnswer={handleAnswer}
                />
              </Motion.div>
            </AnimatePresence>

            <div className="test-page__nav-buttons mt-6">
              <button
                className="btn btn--secondary"
                onClick={goPrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </button>

              {currentIndex < activeTriplets.length - 1 ? (
                <button
                  className="btn btn--primary"
                  onClick={goNext}
                  disabled={!isAnswered}
                >
                  Next
                </button>
              ) : (
                <button className="btn btn--primary" onClick={finishTest} disabled={!isAnswered}>
                  {isAnswered ? 'Generate Report' : 'Finish'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
