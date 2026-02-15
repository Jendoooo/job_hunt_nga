import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { earlySaveAttempt } from '../utils/earlySave'

/* ── constants ─────────────────────────────────────────────────────────────── */
const DURATION = 5 * 60       // 5-minute practice
const WINDOW_MS = 5000        // 5-second response window (immediate events)
const ALARM_PHASE_MS = 2500   // alarm phase: values stay in red (two-phase events)
const CLEAR_PHASE_MS = 4500   // clearing phase: user must press after values return safe
const GAP_MIN = 3500
const GAP_MAX = 7500
const PTS_HIT = 10
const PTS_MISS = 5
const HARD_PTS_EARLY = 2
const HARD_INPUT_LATENCY_MIN_MS = 200
const HARD_INPUT_LATENCY_MAX_MS = 300

// Events where user must WAIT for values to return to safe zone before pressing
const TWO_PHASE_EVENTS = new Set(['gas_o2_low','gas_co2_low','gas_both_low','temp_high','power_high'])

const EVENT_POOL = [
  { type: 'power_high',   action: 'generator_off'  },
  { type: 'temp_high',    action: 'temp_btn'        },
  { type: 'gas_o2_low',   action: 'gas_reset'       },
  { type: 'gas_co2_low',  action: 'gas_reset'       },
  { type: 'gas_both_low', action: 'gas_alarm'       },
  { type: 'gas_o2_temp',  action: 'system_reset'    },
  { type: 'stab_north',   action: 'stab_n'          },
  { type: 'stab_west',    action: 'stab_w'          },
  { type: 'stab_both',    action: 'stab_recentre'   },
]

const ZONE_LABEL = {
  power_high:   'Generator alert',
  temp_high:    'Temperature alert',
  gas_o2_low:   'O₂ Gas alert',
  gas_co2_low:  'CO₂ Gas alert',
  gas_both_low: 'Gas alert',
  gas_o2_temp:  'System Reset alert',
  stab_north:   'N Stabilizer alert',
  stab_west:    'W Stabilizer alert',
  stab_both:    'Stabilizer alert',
}

/* ── helpers ───────────────────────────────────────────────────────────────── */
function rand(lo, hi) { return Math.random() * (hi - lo) + lo }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }
function pad2(n) { return String(Math.floor(n)).padStart(2, '0') }
function fmtTime(s) { return `${pad2(s / 60)}:${pad2(s % 60)}` }

function isInAlarmZone(evType, panel) {
  if (!panel || !evType) return false

  // Hard-mode validation checks the actual readings (no pre-alert logic).
  if (evType === 'power_high') return panel.gen.power >= 75
  if (evType === 'temp_high') return panel.temp.value >= 75
  if (evType === 'gas_o2_low') return panel.gas.o2 < 20
  if (evType === 'gas_co2_low') return panel.gas.co2 < 20
  if (evType === 'gas_both_low') return panel.gas.o2 < 20 || panel.gas.co2 < 20
  return false
}

function initPanel() {
  return {
    gen:   { power: 42 },
    temp:  { value: 40, spikes: 0, history: Array(50).fill(40) },
    gas:   { o2: 65, co2: 60 },
    stabN: { angle: -8 },
    stabW: { angle: 12 },
  }
}

function clonePanel(p) {
  return {
    gen:   { ...p.gen },
    temp:  { ...p.temp, history: [...p.temp.history] },
    gas:   { ...p.gas },
    stabN: { ...p.stabN },
    stabW: { ...p.stabW },
  }
}

function applyEvent(type, p) {
  const n = clonePanel(p)
  if (type === 'power_high')   { n.gen.power = 88 }
  if (type === 'temp_high')    { n.temp.value = 85 }
  if (type === 'gas_o2_low')   { n.gas.o2 = 12 }
  if (type === 'gas_co2_low')  { n.gas.co2 = 12 }
  if (type === 'gas_both_low') { n.gas.o2 = 10; n.gas.co2 = 10 }
  if (type === 'gas_o2_temp')  { n.gas.o2 = 10; n.temp.value = 85 }
  if (type === 'stab_north')   { n.stabN.angle = 80 }
  if (type === 'stab_west')    { n.stabW.angle = -80 }
  if (type === 'stab_both')    { n.stabN.angle = 80; n.stabW.angle = -80 }
  return n
}

function resolveEvent(type, p) {
  const n = clonePanel(p)
  if (type === 'power_high')   { n.gen.power = 45 }
  if (type === 'temp_high')    { n.temp.value = 40; n.temp.spikes = (p.temp.spikes + 1) % 3 }
  if (type === 'gas_o2_low')   { n.gas.o2 = 65 }
  if (type === 'gas_co2_low')  { n.gas.co2 = 60 }
  if (type === 'gas_both_low') { n.gas.o2 = 65; n.gas.co2 = 60 }
  if (type === 'gas_o2_temp')  { n.gas.o2 = 65; n.temp.value = 40; n.temp.spikes = (p.temp.spikes + 1) % 3 }
  if (type === 'stab_north')   { n.stabN.angle = rand(-15, 15) }
  if (type === 'stab_west')    { n.stabW.angle = rand(-15, 15) }
  if (type === 'stab_both')    { n.stabN.angle = rand(-15, 15); n.stabW.angle = rand(-15, 15) }
  return n
}

/* ── sub-components ────────────────────────────────────────────────────────── */
function AlarmLamp({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        display: 'inline-block',
        background: on ? '#ef4444' : '#1e2d3d',
        border: `1.5px solid ${on ? '#ef4444' : '#243044'}`,
      }}
    />
  )
}

function PowerBars({ power, alert }) {
  const thresholds = [15, 30, 45, 60, 75, 88]
  const colors = ['#22c55e','#22c55e','#22c55e','#f59e0b','#f97316','#ef4444']
  return (
    <div className="pm-power-bars">
      {thresholds.map((t, i) => (
        <div
          key={i}
          className="pm-power-bar"
          style={{
            height: `${20 + i * 8}px`,
            background: power >= t ? colors[i] : 'rgba(255,255,255,0.08)',
            boxShadow: alert && power >= t ? `0 0 8px ${colors[i]}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

function TempGraph({ history, value }) {
  const H = 260
  const W = 320
  const redLine = H * (1 - 75 / 100)
  const points = history.map((v, i) => `${(i / 49) * W},${H - (v / 100) * H}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pm-temp-graph" preserveAspectRatio="none">
      <rect x="0" y="0" width={W} height={redLine} fill="rgba(239,68,68,0.15)" />
      <line x1="0" y1={redLine} x2={W} y2={redLine} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,3" />
      <polyline points={points} fill="none" stroke="#84cc16" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={W} cy={H - (value / 100) * H} r="3" fill="#84cc16" />
    </svg>
  )
}

function GasBar({ label, level, alert, inverted = false }) {
  const fillPct = clamp(level, 0, 100)
  const redZonePct = 25
  // O₂: red at bottom (low = danger), CO₂ (inverted): red at top (high = danger)
  const inRed = inverted ? fillPct >= (100 - redZonePct) : fillPct <= redZonePct
  return (
    <div className="pm-gas-col">
      <span className="pm-gas-label">{label}</span>
      <div className={`pm-gas-track ${inverted ? 'pm-gas-track--inverted' : ''}`}>
        {inverted ? (
          <>
            {/* CO₂: red danger zone at TOP (high = danger) */}
            <div className="pm-gas-red-zone" style={{ height: `${redZonePct}%`, top: 0, bottom: 'auto', borderRadius: '12px 12px 0 0' }} />
            <div className="pm-gas-safe-zone" style={{ top: `${redZonePct}%`, bottom: 0, height: 'auto', borderRadius: '0 0 12px 12px' }} />
            <div className="pm-gas-threshold" style={{ top: `${redZonePct}%`, bottom: 'auto' }} />
          </>
        ) : (
          <>
            {/* O₂: red danger zone at BOTTOM (low = danger) */}
            <div className="pm-gas-safe-zone" />
            <div className="pm-gas-red-zone" style={{ height: `${redZonePct}%` }} />
            <div className="pm-gas-threshold" style={{ bottom: `${redZonePct}%` }} />
          </>
        )}
        {/* Capsule indicator */}
        <div
          className={`pm-gas-indicator ${inRed || alert ? 'pm-gas-indicator--alert' : ''}`}
          style={{ bottom: `calc(${fillPct}% - 12px)` }}
        />
      </div>
    </div>
  )
}

function StabDial({ angle, alert, label1, label2 }) {
  const R = 36
  const rad = (angle * Math.PI) / 180
  const ix = Math.sin(rad) * R
  const iy = -Math.cos(rad) * R
  const ringColor = alert ? '#ef4444' : '#0d9488'
  const dotColor  = alert ? '#ef4444' : '#ffffff'
  return (
    <svg viewBox="-50 -50 100 100" className={`pm-dial-svg ${alert ? 'pm-dial--alert' : ''}`}>
      <circle r="46" fill="#0f172a" />
      <circle r={R} fill="none" stroke={ringColor} strokeWidth="8" />
      {/* Red arc: RIGHT danger zone (55° to 105° clockwise from 12 o'clock) */}
      <path
        d="M 29.5 -20.7 A 36 36 0 0 1 34.8 9.3"
        fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.4"
      />
      {/* Red arc: LEFT danger zone (255° to 305° clockwise from 12 o'clock) */}
      <path
        d="M -34.8 9.3 A 36 36 0 0 1 -29.5 -20.7"
        fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.4"
      />
      <circle r="18" fill="#1e293b" />
      {/* Needle */}
      <line x1="0" y1="0" x2={ix} y2={iy} stroke={dotColor} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ix} cy={iy} r="5" fill={dotColor} />
      <circle r="3.5" fill="#94a3b8" />
      <text x="-44" y="5" className="pm-dial-text">{label1}</text>
      <text x="44"  y="5" className="pm-dial-text">{label2}</text>
    </svg>
  )
}

/* ── main component ────────────────────────────────────────────────────────── */
export default function NLNGProcessMonitorTest({ variant = 'practice' } = {}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isHard = variant === 'hard'
  const assist = !isHard
  const [phase, setPhase]         = useState('setup')
  const [panel, setPanel]         = useState(initPanel)
  const [timeLeft, setTimeLeft]   = useState(DURATION)
  const [score, setScore]         = useState(0)
  const [maxScore, setMaxScore]   = useState(0)
  const [hits, setHits]           = useState(0)
  const [misses, setMisses]       = useState(0)
  const [activeEvent, setActiveEvent] = useState(null)
  const [evPhase, setEvPhase]     = useState(null)   // 'alarm' | 'clearing' | null
  const [cntPct, setCntPct]       = useState(100)
  const [flash, setFlash]         = useState(null)  // { msg, ok }
  const [showHelp, setShowHelp]   = useState(false)

  // Refs for use inside timers
  const phaseRef        = useRef('setup')
  const panelRef        = useRef(initPanel())
  const evRef           = useRef(null)
  const evPhaseRef      = useRef(null)
  const scoreRef        = useRef(0)
  const hitsRef         = useRef(0)
  const missesRef       = useRef(0)
  const maxScoreRef     = useRef(0)
  const scheduleNextRef = useRef(null)   // so handleAction can trigger next event
  const alarmToutRef    = useRef(null)   // alarm-phase auto-resolve timeout
  const attemptIdRef    = useRef(null)
  const finishedRef     = useRef(false)  // guard against double finish
  const actionLockRef   = useRef(false)  // hard-mode input latency + anti-spam guard

  function showFlash(msg, ok) {
    if (isHard) return
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 1100)
  }

  /* ── start ─────────────────────────────────────────────────────────────── */
  function startGame() {
    const p = initPanel()
    setPanel(p); panelRef.current = p
    setTimeLeft(DURATION)
    setScore(0); scoreRef.current = 0
    setHits(0);  hitsRef.current = 0
    setMisses(0); missesRef.current = 0
    setMaxScore(0); maxScoreRef.current = 0
    setActiveEvent(null); evRef.current = null
    setEvPhase(null); evPhaseRef.current = null
    clearTimeout(alarmToutRef.current)
    setCntPct(100)
    setFlash(null)
    attemptIdRef.current = null
    finishedRef.current = false
    actionLockRef.current = false
    phaseRef.current = 'playing'
    setPhase('playing')
  }

  /* ── finish & save ──────────────────────────────────────────────────────── */
  function finishGame() {
    if (finishedRef.current) return          // guard against double-call
    finishedRef.current = true
    phaseRef.current = 'results'

    const finalScore    = scoreRef.current
    const finalMaxScore = maxScoreRef.current
    const finalHits     = hitsRef.current
    const finalMisses   = missesRef.current
    const pct = finalMaxScore > 0 ? Math.round((finalScore / finalMaxScore) * 100) : 0

    // Generate stable attempt ID for this run
    attemptIdRef.current = crypto.randomUUID()

    // Persist to outbox before results screen renders
    earlySaveAttempt({
      attemptId:      attemptIdRef.current,
      user,
      questions:      [],                          // no question array for PM
      answers:        { hits: finalHits, misses: finalMisses, events: finalHits + finalMisses },
      assessmentType: 'nlng-process-monitoring',
      moduleName:     isHard ? 'Process Monitoring (Hard Mode)' : 'Process Monitoring (5 min simulation)',
      elapsed:        DURATION - (timeLeft > 0 ? timeLeft : 0),
      mode:           'practice',
      scoreOverride:  pct,                         // save percentage as score
      totalOverride:  100,                         // out of 100
      answersForSave: {
        score: finalScore,
        maxScore: finalMaxScore,
        hits: finalHits,
        misses: finalMisses,
        totalEvents: finalHits + finalMisses,
        variant: isHard ? 'hard' : 'practice',
      },
    })

    setPhase('results')
  }

  /* ── button handler ─────────────────────────────────────────────────────── */
  const handleAction = useCallback((btnId) => {
    if (phaseRef.current !== 'playing') return

    if (isHard) {
      if (actionLockRef.current) return
      const clickEvDeadline = evRef.current?.deadline
      if (!clickEvDeadline) return

      actionLockRef.current = true
      const latencyMs = Math.round(rand(HARD_INPUT_LATENCY_MIN_MS, HARD_INPUT_LATENCY_MAX_MS))

      setTimeout(() => {
        actionLockRef.current = false
        if (phaseRef.current !== 'playing') return
        const ev = evRef.current
        if (!ev || ev.deadline !== clickEvDeadline) return
        processAction(btnId, ev)
      }, latencyMs)

      return
    }

    const ev = evRef.current
    if (!ev) return
    processAction(btnId, ev)
  }, [isHard])

  function processAction(btnId, ev) {
    // System Reset is only valid during a system trip (gas_o2_temp)
    if (btnId === 'system_reset' && ev.type !== 'gas_o2_temp') {
      showFlash('⚠ System Reset: only on system trip!', false)
      return
    }

    const isTwoPhase = TWO_PHASE_EVENTS.has(ev.type)
    const stillInAlarmZone = isTwoPhase && isInAlarmZone(ev.type, panelRef.current)

    // Two-phase events: user must WAIT for values to return to safe zone before pressing.
    if (isTwoPhase && stillInAlarmZone) {
      if (isHard) {
        scoreRef.current = Math.max(0, scoreRef.current - HARD_PTS_EARLY)
        setScore(scoreRef.current)
        return
      }
      showFlash('⏳ Wait — value still in alarm zone!', false)
      return
    }

    const spikesAtStart = typeof ev?.ctx?.tempSpikesAtStart === 'number'
      ? ev.ctx.tempSpikesAtStart
      : null
    const spikesNow = panelRef.current.temp.spikes
    const spikesForTemp = spikesAtStart ?? spikesNow

    let correct = false

    if (btnId === 'generator_off')  correct = ev.action === 'generator_off'
    if (btnId === 'high')           correct = ev.type === 'temp_high' && spikesForTemp < 2
    if (btnId === '3rd_high')       correct = ev.type === 'temp_high' && spikesForTemp === 2
    if (btnId === 'gas_reset')      correct = ev.action === 'gas_reset'
    if (btnId === 'gas_alarm')      correct = ev.action === 'gas_alarm'
    if (btnId === 'system_reset')   correct = ev.action === 'system_reset'
    if (btnId === 'stab_n')         correct = ev.action === 'stab_n'
    if (btnId === 'stab_w')         correct = ev.action === 'stab_w'
    if (btnId === 'stab_recentre')  correct = ev.action === 'stab_recentre'

    // gas_o2_temp event: temp_btn also valid for temperature spike
    if (ev.type === 'gas_o2_temp') {
      if (btnId === 'high')     correct = spikesNow < 2
      if (btnId === '3rd_high') correct = spikesNow === 2
    }

    if (correct) {
      clearTimeout(alarmToutRef.current)
      evPhaseRef.current = null
      setEvPhase(null)

      // Two-phase events already returned to safe values at the end of alarm phase.
      // Pressing acknowledges/clears the alarm, it should not mutate readings again.
      if (!isTwoPhase) {
        setPanel((prev) => {
          const n = resolveEvent(ev.type, prev)
          panelRef.current = n
          return n
        })
      }

      evRef.current = null
      setActiveEvent(null)
      setCntPct(100)
      scoreRef.current += PTS_HIT
      hitsRef.current += 1
      setScore(scoreRef.current)
      setHits(hitsRef.current)
      showFlash(`+${PTS_HIT} Correct!`, true)
      // Re-start the event chain
      setTimeout(() => scheduleNextRef.current?.(), 900)
    } else {
      showFlash('Wrong button!', false)
    }
  }

  /* ── game loop ──────────────────────────────────────────────────────────── */
  // Separate effect: finish game when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && phaseRef.current === 'playing') {
      finishGame()
    }
  }, [timeLeft])

  useEffect(() => {
    if (phase !== 'playing') return

    // Countdown timer
    const timerIv = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    // Ambient panel animation (every 400ms)
    const ambientIv = setInterval(() => {
      setPanel((prev) => {
        const ev = evRef.current
        const n = clonePanel(prev)
        if (!ev || ev.type !== 'power_high')
          n.gen.power = clamp(prev.gen.power + rand(-3, 3), 28, 62)
        if (!ev || (ev.type !== 'temp_high' && ev.type !== 'gas_o2_temp'))
          n.temp.value = clamp(prev.temp.value + rand(-2, 2), 22, 58)
        n.temp.history = [...prev.temp.history.slice(1), n.temp.value]
        if (!ev || (ev.type !== 'gas_o2_low' && ev.type !== 'gas_both_low' && ev.type !== 'gas_o2_temp'))
          n.gas.o2 = clamp(prev.gas.o2 + rand(-1.5, 1.5), 42, 80)
        if (!ev || (ev.type !== 'gas_co2_low' && ev.type !== 'gas_both_low'))
          n.gas.co2 = clamp(prev.gas.co2 + rand(-1.5, 1.5), 42, 78)
        if (!ev || (ev.type !== 'stab_north' && ev.type !== 'stab_both'))
          n.stabN.angle = clamp(prev.stabN.angle + rand(-3, 3), -28, 28)
        if (!ev || (ev.type !== 'stab_west' && ev.type !== 'stab_both'))
          n.stabW.angle = clamp(prev.stabW.angle + rand(-3, 3), -28, 28)
        panelRef.current = n
        return n
      })
    }, 400)

    // Event scheduler
    let evTimeout = null
    let missTimeout = null
    let cntIv = null

    function clearEvTimers() {
      clearTimeout(missTimeout)
      clearInterval(cntIv)
      clearTimeout(alarmToutRef.current)
      missTimeout = null
      cntIv = null
      alarmToutRef.current = null
    }

    function scheduleNext() {
      if (phaseRef.current !== 'playing') return
      const delay = rand(GAP_MIN, GAP_MAX)
      evTimeout = setTimeout(() => {
        if (phaseRef.current !== 'playing' || evRef.current) { scheduleNext(); return }

        const ev = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]
        const isTwoPhase = TWO_PHASE_EVENTS.has(ev.type)
        const totalWindow = isTwoPhase ? (ALARM_PHASE_MS + CLEAR_PHASE_MS) : WINDOW_MS
        const deadline = Date.now() + totalWindow

        // Capture context needed to validate responses after the alarm phase.
        const ctx = {}
        if (ev.type === 'temp_high') {
          ctx.tempSpikesAtStart = panelRef.current.temp.spikes
        }

        const newEv = { ...ev, deadline, ctx }

        setPanel((prev) => { const n = applyEvent(ev.type, prev); panelRef.current = n; return n })
        evRef.current = newEv
        setActiveEvent(newEv)
        maxScoreRef.current += PTS_HIT
        setMaxScore(maxScoreRef.current)
        setCntPct(100)

        if (isTwoPhase) {
          // Alarm phase: values in red zone — user must WAIT
          evPhaseRef.current = 'alarm'
          setEvPhase('alarm')
          // After ALARM_PHASE_MS: auto-resolve panel values, switch to clearing phase
          alarmToutRef.current = setTimeout(() => {
            if (evRef.current?.deadline !== deadline) return
            setPanel((prev) => { const n = resolveEvent(ev.type, prev); panelRef.current = n; return n })
            evPhaseRef.current = 'clearing'
            setEvPhase('clearing')
          }, ALARM_PHASE_MS)
        } else {
          // Immediate events (stabilizers, system trip): press right away
          evPhaseRef.current = 'clearing'
          setEvPhase('clearing')
        }

        // Countdown visual (over full totalWindow)
        const start = Date.now()
        cntIv = setInterval(() => {
          setCntPct(Math.max(0, 100 - ((Date.now() - start) / totalWindow) * 100))
        }, 50)

        // Miss timeout
        missTimeout = setTimeout(() => {
          if (evRef.current?.deadline !== deadline) return
          clearEvTimers()
          // For immediate events, panel not yet resolved — resolve now
          if (!isTwoPhase) {
            setPanel((prev) => { const n = resolveEvent(ev.type, prev); panelRef.current = n; return n })
          }
          evRef.current = null
          setActiveEvent(null)
          evPhaseRef.current = null
          setEvPhase(null)
          setCntPct(100)
          scoreRef.current = Math.max(0, scoreRef.current - PTS_MISS)
          missesRef.current += 1
          setScore(scoreRef.current)
          setMisses(missesRef.current)
          showFlash(`Missed! -${PTS_MISS}`, false)
          scheduleNext()
        }, totalWindow)
      }, delay)
    }

    scheduleNextRef.current = scheduleNext
    scheduleNext()

    return () => {
      clearInterval(timerIv)
      clearInterval(ambientIv)
      clearTimeout(evTimeout)
      clearEvTimers()
      evPhaseRef.current = null
    }
  }, [phase])

  /* ── derived alert flags ────────────────────────────────────────────────── */
  const ev = activeEvent
  const genAlert   = ev?.type === 'power_high'
  const tempAlert  = ev?.type === 'temp_high' || ev?.type === 'gas_o2_temp'
  const gasO2Alert = ev?.type === 'gas_o2_low' || ev?.type === 'gas_both_low' || ev?.type === 'gas_o2_temp'
  const gasCO2Alert= ev?.type === 'gas_co2_low' || ev?.type === 'gas_both_low'
  const sysAlert   = ev?.type === 'gas_o2_temp'
  const _alarmAlert = ev?.type === 'gas_both_low'
  const stabNAlert = ev?.type === 'stab_north' || ev?.type === 'stab_both'
  const stabWAlert = ev?.type === 'stab_west'  || ev?.type === 'stab_both'
  const recentreAlert = ev?.type === 'stab_both'

  const spikes = panel.temp.spikes

  /* ── setup screen ──────────────────────────────────────────────────────── */
  if (phase === 'setup') {
    return (
      <div className="test-page">
        <header className="test-page__header test-page__header--compact">
          <div className="test-page__header-left">
            <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
              <ArrowLeft size={18} /> Dashboard
            </button>
          </div>
          <div className="test-page__header-right">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>SHL Verify Interactive</span>
          </div>
        </header>
        <div className="pm-setup-card">
          <div className="pm-setup-header">
            <div className="pm-setup-badge">SHL Verify Interactive</div>
            <h1 className="pm-setup-title">Process Monitoring</h1>
            <p className="pm-setup-sub">
              {assist
                ? '5-minute practice simulation · Respond within 5 seconds per event'
                : 'Hard mode simulation · Minimal on-screen guidance'
              }
            </p>
          </div>

          <div className="pm-rules-grid">
            <div className="pm-rules-col">
              <div className="pm-rules-title">Control Panel Rules</div>
              <table className="pm-rules-table">
                <thead><tr><th>Condition</th><th>Action</th></tr></thead>
                <tbody>
                  <tr><td>Power too high</td><td>Turn Generator <strong>Off</strong></td></tr>
                  <tr><td>Temperature high (1st/2nd spike)</td><td>Press <strong>High</strong></td></tr>
                  <tr><td>Temperature high (3rd spike)</td><td>Press <strong>3rd High</strong></td></tr>
                  <tr><td>One gas in red, temp normal</td><td>Press <strong>Reset</strong> (gas)</td></tr>
                  <tr><td>O₂ low + temp high (System Trip)</td><td>Press <strong>System Reset</strong> immediately</td></tr>
                  <tr><td>Both gases in red</td><td>Press <strong>Alarm</strong></td></tr>
                  <tr><td>N Stabilizer needle in red zone</td><td>Press <strong>Reset</strong> (N Stab)</td></tr>
                  <tr><td>W Stabilizer needle in red zone</td><td>Press <strong>Reset</strong> (W Stab)</td></tr>
                  <tr><td>Both stabilizer needles in red</td><td>Press <strong>Recentre</strong></td></tr>
                </tbody>
              </table>
              <div className="pm-two-phase-note">
                ⚠ Gas · Temperature · Power alerts: <strong>wait</strong> for the value to return to the safe zone — then press the action button to clear the alarm.
              </div>
            </div>
            {assist ? (
              <div className="pm-rules-col">
                <div className="pm-rules-title">Scoring</div>
                <div className="pm-score-info">
                  <div className="pm-score-row"><span className="pm-badge pm-badge--green">+{PTS_HIT}</span> Correct response in time</div>
                  <div className="pm-score-row"><span className="pm-badge pm-badge--red">−{PTS_MISS}</span> No response (timeout)</div>
                  <div className="pm-score-row"><span className="pm-badge pm-badge--gray">0</span> Wrong button pressed</div>
                </div>
                <div className="pm-rules-title" style={{ marginTop: '1rem' }}>Tips</div>
                <ul className="pm-tips">
                  <li>Keep mental count of temperature spikes (resets at 3)</li>
                  <li>Watch ALL zones simultaneously — multiple can alert</li>
                  <li>Gas Reset ≠ System Reset — read the condition carefully</li>
                </ul>
              </div>
            ) : (
              <div className="pm-rules-col">
                <div className="pm-rules-title">Hard Mode</div>
                <div className="pm-score-info">
                  <div className="pm-score-row">No in-test hints, countdown, or live scoring</div>
                  <div className="pm-score-row">200–300ms input latency on button presses</div>
                  <div className="pm-score-row">Early presses during the alarm phase deduct points</div>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn--primary pm-start-btn" onClick={startGame}>
            {assist ? 'Start 5-Minute Practice' : 'Start Hard Mode'}
          </button>
          <button className="btn btn--ghost pm-back-btn" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  /* ── results screen ─────────────────────────────────────────────────────── */
  if (phase === 'results') {
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    const pass = pct >= 60
    const percentileLabel = pct >= 90
      ? 'Top 10% (90th+ percentile)'
      : pct >= 75
        ? 'Above Average (75th percentile)'
        : pct >= 60
          ? 'Average (50th–75th percentile)'
          : pct >= 40
            ? 'Below Average (25th–50th percentile)'
            : 'Needs Development (<25th percentile)'
    const devAdvice = pct >= 75
      ? 'You demonstrated strong ability to monitor a control panel and respond to alerts promptly. You are likely to perform well on the SHL Verify Interactive Process Monitoring assessment with continued practice.'
      : pct >= 60
        ? 'You will likely, with appropriate instruction and a reasonable learning curve, be able to successfully complete tasks involving the interpretation of machine readings and timely responses to control panel alerts.'
        : 'Focus on learning the rules table thoroughly before each session. Identifying the alert zone first, then recalling the correct action, is the key skill assessed. Additional practice sessions are recommended before your assessment.'
    return (
      <div className="test-page">
        <header className="test-page__header test-page__header--compact">
          <div className="test-page__header-left">
            <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
              <ArrowLeft size={18} /> Dashboard
            </button>
          </div>
        </header>
        <div className="pm-results-card">
          <div className={`pm-results-header ${pass ? 'pm-results-header--pass' : 'pm-results-header--fail'}`}>
            <div className="pm-results-label">Simulation Complete</div>
            <div className="pm-results-score">{score} / {maxScore}</div>
            <div className="pm-results-pct">{pct}%</div>
            <div className="pm-results-percentile">{percentileLabel}</div>
            <div className="pm-results-verdict">{pass ? 'Good performance' : 'Keep practising'}</div>
          </div>
          <div className="pm-results-stats">
            <div className="pm-stat"><span className="pm-stat__num pm-stat__num--green">{hits}</span><span className="pm-stat__label">Correct</span></div>
            <div className="pm-stat"><span className="pm-stat__num pm-stat__num--red">{misses}</span><span className="pm-stat__label">Missed</span></div>
            <div className="pm-stat"><span className="pm-stat__num">{hits + misses}</span><span className="pm-stat__label">Total Events</span></div>
          </div>
          <div className="pm-results-advice">
            <div className="pm-results-advice__title">Development Guidance</div>
            <p className="pm-results-advice__text">{devAdvice}</p>
          </div>
          <div className="pm-results-actions">
            <button className="btn btn--primary" onClick={startGame}>Try Again</button>
            <button className="btn btn--ghost" onClick={() => navigate('/')}>Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── playing screen ─────────────────────────────────────────────────────── */
  return (
    <div className="test-page">
      {/* Platform header */}
      <header className="test-page__header test-page__header--compact">
        <div className="test-page__header-left">
          <button className="btn btn--ghost flex items-center gap-2" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Dashboard
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)' }}>Process Monitoring</span>
          {!assist && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 800, letterSpacing: '.06em' }}>
              HARD MODE
            </span>
          )}
        </div>
        <div className="test-page__header-right">
          <div className={`pm-timer ${timeLeft <= 60 ? 'pm-timer--urgent' : ''}`}>{fmtTime(timeLeft)}</div>
          {assist && <div className="pm-header__score">Score: <strong>{score}</strong></div>}
          <button
            className="btn btn--ghost pm-end-btn"
            onClick={finishGame}
          >End Test</button>
          <button
            className="pm-help-btn"
            onClick={() => setShowHelp(h => !h)}
            title="Rules reference"
          >?</button>
        </div>
      </header>

      {/* Help overlay */}
      {showHelp && (
        <div className="pm-help-overlay" onClick={() => setShowHelp(false)}>
          <div className="pm-help-card" onClick={e => e.stopPropagation()}>
            <div className="pm-help-card__header">
              <span>Control Panel Rules</span>
              <button className="pm-help-card__close" onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <table className="pm-rules-table pm-rules-table--help">
              <thead><tr><th>Condition</th><th>Action</th></tr></thead>
              <tbody>
                <tr><td>Power too high</td><td><strong>On / Off</strong></td></tr>
                <tr><td>Temperature high (1st/2nd spike)</td><td><strong>High</strong></td></tr>
                <tr><td>Temperature high (3rd spike)</td><td><strong>3rd High</strong></td></tr>
                <tr><td>One gas in red zone</td><td><strong>Reset</strong> (gas)</td></tr>
                <tr><td>O₂ low + temp high (System Trip)</td><td><strong>System Reset</strong></td></tr>
                <tr><td>Both gases in red zone</td><td><strong>Alarm</strong></td></tr>
                <tr><td>N Stabilizer in red zone</td><td><strong>Reset</strong> (N Stab)</td></tr>
                <tr><td>W Stabilizer in red zone</td><td><strong>Reset</strong> (W Stab)</td></tr>
                <tr><td>Both stabilizers in red</td><td><strong>Recentre</strong></td></tr>
              </tbody>
            </table>
            <p className="pm-help-card__note">⚠ Two-phase events (Gas, Temp, Power): <strong>wait</strong> for values to return to safe zone before pressing.</p>
          </div>
        </div>
      )}

      <div className="pm-playing-wrap">
      {assist && (
        <div className="pm-countdown-track">
          <div
            className="pm-countdown-bar"
            style={{
              width: `${cntPct}%`,
              background: evPhase === 'alarm'
                ? '#ef4444'
                : (cntPct > 50 ? '#84cc16' : cntPct > 25 ? '#f59e0b' : '#ef4444'),
              opacity: ev ? 1 : 0,
            }}
          />
        </div>
      )}

      {assist && flash && (
        <div className={`pm-flash ${flash.ok ? 'pm-flash--ok' : 'pm-flash--err'}`}>
          {flash.msg}
        </div>
      )}

      {/* Event hint */}
      {assist && ev && (
        <div className={`pm-event-hint ${evPhase === 'alarm' ? 'pm-event-hint--wait' : 'pm-event-hint--act'}`}>
          {evPhase === 'alarm'
            ? `⛔ ${ZONE_LABEL[ev.type] ?? 'Alert'} — wait for value to return to safe zone`
            : `✓ ${ZONE_LABEL[ev.type] ?? 'Alert'} cleared — press the action button now!`
          }
        </div>
      )}

      {/* Panel header bar */}
      <div className="pm-panel-header">
        <span className="pm-panel-header__title">◉ Process Control System</span>
        {assist && (
          <span className={`pm-panel-header__status ${ev ? (evPhase === 'alarm' ? 'pm-panel-header__status--wait' : 'pm-panel-header__status--alert') : ''}`}>
            {ev ? (evPhase === 'alarm' ? '⛔ WAIT — ALARM ACTIVE' : '✓ CLEARED — ACT NOW') : '● MONITORING'}
          </span>
        )}
      </div>

      {/* Control Panel */}
      <div className="pm-panel">

        {/* ── Col 1: Generator + Temperature ─────────────────────────────── */}
        <div className="pm-col">
          {/* Generator */}
          <div className={`pm-zone ${assist && genAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                {!assist && <AlarmLamp on={genAlert} />}
                Generator
              </span>
            </div>
            <div className="pm-gen-display">
              <PowerBars power={panel.gen.power} alert={assist && genAlert} />
              <div className="pm-power-label">{Math.round(panel.gen.power)}%</div>
            </div>
            <button
              className="pm-btn"
              onClick={() => handleAction('generator_off')}
            >
              On / Off
            </button>
          </div>

          {/* Temperature */}
          <div className={`pm-zone ${assist && tempAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                {!assist && <AlarmLamp on={tempAlert} />}
                Temperature
              </span>
              {assist && <span className="pm-spike-count">Spike: {spikes}/3</span>}
            </div>
            <TempGraph history={panel.temp.history} value={panel.temp.value} />
            <div className="pm-temp-val">{Math.round(panel.temp.value)}°</div>
            <div className="pm-btn-row">
              <button
                className="pm-btn"
                onClick={() => handleAction('high')}
              >
                High
              </button>
              <button
                className="pm-btn"
                onClick={() => handleAction('3rd_high')}
              >
                3rd High
              </button>
            </div>
          </div>
        </div>

        {/* ── Col 2: System Reset + Gas ────────────────────────────────────── */}
        <div className="pm-col">
          {/* System Reset */}
          <div className={`pm-zone pm-zone--center ${assist && sysAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                {!assist && <AlarmLamp on={sysAlert} />}
                System Reset
              </span>
            </div>
            <div className={`pm-sysreset-dial ${assist && sysAlert ? 'pm-sysreset-dial--alert' : ''}`}>
              <div className="pm-sysreset-ring" />
              <div className="pm-sysreset-inner">↺</div>
            </div>
            <button
              className="pm-btn"
              onClick={() => handleAction('system_reset')}
            >
              System Reset
            </button>
          </div>

          {/* Gas */}
          <div className={`pm-zone ${assist && (gasO2Alert || gasCO2Alert) ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                {!assist && <AlarmLamp on={gasO2Alert || gasCO2Alert} />}
                Gas Levels
              </span>
            </div>
            <button
              className="pm-btn"
              onClick={() => handleAction('gas_alarm')}
            >
              Alarm
            </button>
            <div className="pm-gas-bars">
              <GasBar label="O₂" level={panel.gas.o2} alert={assist && gasO2Alert} />
              <GasBar label="CO₂" level={panel.gas.co2} alert={assist && gasCO2Alert} inverted />
            </div>
            <button
              className="pm-btn"
              onClick={() => handleAction('gas_reset')}
            >
              Reset
            </button>
          </div>
        </div>

        {/* ── Col 3: Stabilizers ───────────────────────────────────────────── */}
        <div className="pm-col pm-col--stab">
          {/* North Stabilizer */}
          <div className={`pm-zone pm-zone--stab ${assist && stabNAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">N Stabilizer</div>
            <StabDial angle={panel.stabN.angle} alert={assist && stabNAlert} label1="N" label2="S" />
            <button
              className="pm-btn"
              onClick={() => handleAction('stab_n')}
            >
              Reset
            </button>
          </div>

          {/* Recentre */}
          <div className={`pm-zone pm-zone--recentre ${assist && recentreAlert ? 'pm-zone--alert' : ''}`}>
            <button
              className="pm-btn pm-btn--recentre"
              onClick={() => handleAction('stab_recentre')}
            >
              Recentre
            </button>
          </div>

          {/* West Stabilizer */}
          <div className={`pm-zone pm-zone--stab ${assist && stabWAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">W Stabilizer</div>
            <StabDial angle={panel.stabW.angle} alert={assist && stabWAlert} label1="W" label2="E" />
            <button
              className="pm-btn"
              onClick={() => handleAction('stab_w')}
            >
              Reset
            </button>
          </div>
        </div>

      </div>{/* end pm-panel */}

      {assist && (
        <div className="pm-footer">
          Events: <strong>{hits + misses}</strong> · Correct: <strong>{hits}</strong> · Missed: <strong>{misses}</strong>
        </div>
      )}
      </div>
    </div>
  )
}
