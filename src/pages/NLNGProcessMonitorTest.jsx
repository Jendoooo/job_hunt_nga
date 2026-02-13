import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/* ── constants ─────────────────────────────────────────────────────────────── */
const DURATION = 5 * 60       // 5-minute practice
const WINDOW_MS = 5000        // 5-second response window
const GAP_MIN = 3500
const GAP_MAX = 7500
const PTS_HIT = 10
const PTS_MISS = 5

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

/* ── helpers ───────────────────────────────────────────────────────────────── */
function rand(lo, hi) { return Math.random() * (hi - lo) + lo }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }
function pad2(n) { return String(Math.floor(n)).padStart(2, '0') }
function fmtTime(s) { return `${pad2(s / 60)}:${pad2(s % 60)}` }

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
            height: `${14 + i * 6}px`,
            background: power >= t ? colors[i] : 'rgba(255,255,255,0.08)',
            boxShadow: alert && power >= t ? `0 0 8px ${colors[i]}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

function TempGraph({ history, value }) {
  const H = 80
  const W = 200
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

function GasBar({ label, level, alert }) {
  const fillPct = clamp(level, 0, 100)
  const redZonePct = 20
  return (
    <div className="pm-gas-col">
      <span className="pm-gas-label">{label}</span>
      <div className="pm-gas-track">
        <div className="pm-gas-red-zone" />
        <div
          className={`pm-gas-fill ${alert ? 'pm-gas-fill--alert' : ''}`}
          style={{ height: `${fillPct}%` }}
        />
        <div className="pm-gas-threshold" style={{ bottom: `${redZonePct}%` }} />
      </div>
      <span className="pm-gas-value">{Math.round(level)}</span>
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
      {/* Red arc: outer right zone (clock 1 o'clock to 5 o'clock) */}
      <circle
        r={R} fill="none"
        stroke="#ef4444" strokeWidth="8"
        strokeDasharray={`${R * 0.9} ${2 * Math.PI * R}`}
        strokeDashoffset={`${-R * 1.1}`}
        opacity="0.35"
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
export default function NLNGProcessMonitorTest() {
  const navigate = useNavigate()
  const [phase, setPhase]         = useState('setup')
  const [panel, setPanel]         = useState(initPanel)
  const [timeLeft, setTimeLeft]   = useState(DURATION)
  const [score, setScore]         = useState(0)
  const [maxScore, setMaxScore]   = useState(0)
  const [hits, setHits]           = useState(0)
  const [misses, setMisses]       = useState(0)
  const [activeEvent, setActiveEvent] = useState(null)
  const [cntPct, setCntPct]       = useState(100)
  const [flash, setFlash]         = useState(null)  // { msg, ok }

  // Refs for use inside timers
  const phaseRef        = useRef('setup')
  const panelRef        = useRef(initPanel())
  const evRef           = useRef(null)
  const scoreRef        = useRef(0)
  const hitsRef         = useRef(0)
  const missesRef       = useRef(0)
  const maxScoreRef     = useRef(0)
  const scheduleNextRef = useRef(null)   // so handleAction can trigger next event

  function showFlash(msg, ok) {
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
    setCntPct(100)
    setFlash(null)
    phaseRef.current = 'playing'
    setPhase('playing')
  }

  /* ── button handler ─────────────────────────────────────────────────────── */
  const handleAction = useCallback((btnId) => {
    if (phaseRef.current !== 'playing') return
    const ev = evRef.current
    if (!ev) return

    const spikes = panelRef.current.temp.spikes
    let correct = false

    if (btnId === 'generator_off')  correct = ev.action === 'generator_off'
    if (btnId === 'high')           correct = ev.type === 'temp_high' && spikes < 2
    if (btnId === '3rd_high')       correct = ev.type === 'temp_high' && spikes === 2
    if (btnId === 'gas_reset')      correct = ev.action === 'gas_reset'
    if (btnId === 'gas_alarm')      correct = ev.action === 'gas_alarm'
    if (btnId === 'system_reset')   correct = ev.action === 'system_reset'
    if (btnId === 'stab_n')         correct = ev.action === 'stab_n'
    if (btnId === 'stab_w')         correct = ev.action === 'stab_w'
    if (btnId === 'stab_recentre')  correct = ev.action === 'stab_recentre'

    // gas_o2_temp event: temp_btn also valid for temperature spike
    if (ev.type === 'gas_o2_temp') {
      if (btnId === 'high')    correct = spikes < 2
      if (btnId === '3rd_high') correct = spikes === 2
    }

    if (correct) {
      setPanel((prev) => {
        const n = resolveEvent(ev.type, prev)
        panelRef.current = n
        return n
      })
      evRef.current = null
      setActiveEvent(null)
      setCntPct(100)
      scoreRef.current += PTS_HIT
      hitsRef.current += 1
      setScore(scoreRef.current)
      setHits(hitsRef.current)
      showFlash(`+${PTS_HIT} Correct!`, true)
      // Re-start the event chain — scheduleNext() was only called on miss, not correct
      setTimeout(() => scheduleNextRef.current?.(), 900)
    } else {
      showFlash('Wrong button!', false)
    }
  }, [])

  /* ── game loop ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'playing') return

    // Countdown timer
    const timerIv = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          phaseRef.current = 'results'
          setPhase('results')
          return 0
        }
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
      missTimeout = null
      cntIv = null
    }

    function scheduleNext() {
      if (phaseRef.current !== 'playing') return
      const delay = rand(GAP_MIN, GAP_MAX)
      evTimeout = setTimeout(() => {
        if (phaseRef.current !== 'playing' || evRef.current) { scheduleNext(); return }

        const ev = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]
        const deadline = Date.now() + WINDOW_MS
        const newEv = { ...ev, deadline }

        setPanel((prev) => { const n = applyEvent(ev.type, prev); panelRef.current = n; return n })
        evRef.current = newEv
        setActiveEvent(newEv)
        maxScoreRef.current += PTS_HIT
        setMaxScore(maxScoreRef.current)
        setCntPct(100)

        // Countdown visual
        const start = Date.now()
        cntIv = setInterval(() => {
          setCntPct(Math.max(0, 100 - ((Date.now() - start) / WINDOW_MS) * 100))
        }, 50)

        // Miss timeout
        missTimeout = setTimeout(() => {
          if (evRef.current?.deadline !== deadline) return
          clearEvTimers()
          setPanel((prev) => { const n = resolveEvent(ev.type, prev); panelRef.current = n; return n })
          evRef.current = null
          setActiveEvent(null)
          setCntPct(100)
          scoreRef.current = Math.max(0, scoreRef.current - PTS_MISS)
          missesRef.current += 1
          setScore(scoreRef.current)
          setMisses(missesRef.current)
          showFlash(`Missed! -${PTS_MISS}`, false)
          scheduleNext()
        }, WINDOW_MS)
      }, delay)
    }

    scheduleNextRef.current = scheduleNext
    scheduleNext()

    return () => {
      clearInterval(timerIv)
      clearInterval(ambientIv)
      clearTimeout(evTimeout)
      clearEvTimers()
    }
  }, [phase])

  /* ── derived alert flags ────────────────────────────────────────────────── */
  const ev = activeEvent
  const genAlert   = ev?.type === 'power_high'
  const tempAlert  = ev?.type === 'temp_high' || ev?.type === 'gas_o2_temp'
  const gasO2Alert = ev?.type === 'gas_o2_low' || ev?.type === 'gas_both_low' || ev?.type === 'gas_o2_temp'
  const gasCO2Alert= ev?.type === 'gas_co2_low' || ev?.type === 'gas_both_low'
  const sysAlert   = ev?.type === 'gas_o2_temp'
  const alarmAlert = ev?.type === 'gas_both_low'
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
            <p className="pm-setup-sub">5-minute practice simulation · Respond within 5 seconds per event</p>
          </div>

          <div className="pm-rules-grid">
            <div className="pm-rules-col">
              <div className="pm-rules-title">Control Panel Rules</div>
              <table className="pm-rules-table">
                <thead><tr><th>Condition</th><th>Action</th></tr></thead>
                <tbody>
                  <tr><td>Power too high</td><td>Turn Generator <strong>Off</strong></td></tr>
                  <tr><td>Temperature high (1st/2nd)</td><td>Press <strong>High</strong></td></tr>
                  <tr><td>Temperature high (3rd)</td><td>Press <strong>3rd High</strong></td></tr>
                  <tr><td>One gas in red, temp normal</td><td>Press <strong>Gas Reset</strong></td></tr>
                  <tr><td>O₂ low + temp high</td><td>Press <strong>System Reset</strong></td></tr>
                  <tr><td>Both gases in red</td><td>Press <strong>Alarm</strong></td></tr>
                  <tr><td>One stabilizer in red</td><td>Press that stabilizer's <strong>Reset</strong></td></tr>
                  <tr><td>Both stabilizers in red</td><td>Press <strong>Recentre</strong></td></tr>
                </tbody>
              </table>
            </div>
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
          </div>

          <button className="btn btn--primary pm-start-btn" onClick={startGame}>
            Start 5-Minute Practice
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
            <div className="pm-results-verdict">{pass ? 'Good performance' : 'Keep practising'}</div>
          </div>
          <div className="pm-results-stats">
            <div className="pm-stat"><span className="pm-stat__num pm-stat__num--green">{hits}</span><span className="pm-stat__label">Correct</span></div>
            <div className="pm-stat"><span className="pm-stat__num pm-stat__num--red">{misses}</span><span className="pm-stat__label">Missed</span></div>
            <div className="pm-stat"><span className="pm-stat__num">{hits + misses}</span><span className="pm-stat__label">Total Events</span></div>
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
        </div>
        <div className="test-page__header-right">
          <div className={`pm-timer ${timeLeft <= 60 ? 'pm-timer--urgent' : ''}`}>{fmtTime(timeLeft)}</div>
          <div className="pm-header__score">Score: <strong>{score}</strong></div>
        </div>
      </header>

      <div className="pm-playing-wrap">
      {/* Countdown bar */}
      <div className="pm-countdown-track">
        <div
          className="pm-countdown-bar"
          style={{
            width: `${cntPct}%`,
            background: cntPct > 50 ? '#84cc16' : cntPct > 25 ? '#f59e0b' : '#ef4444',
            opacity: ev ? 1 : 0,
          }}
        />
      </div>

      {/* Flash feedback */}
      {flash && (
        <div className={`pm-flash ${flash.ok ? 'pm-flash--ok' : 'pm-flash--err'}`}>
          {flash.msg}
        </div>
      )}

      {/* Event hint */}
      {ev && (
        <div className="pm-event-hint">
          ⚠ Alert active — respond within {Math.ceil(cntPct / 20)}s
        </div>
      )}

      {/* Control Panel */}
      <div className="pm-panel">

        {/* ── Col 1: Generator + Temperature ─────────────────────────────── */}
        <div className="pm-col">
          {/* Generator */}
          <div className={`pm-zone ${genAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">Generator</div>
            <div className="pm-gen-display">
              <PowerBars power={panel.gen.power} alert={genAlert} />
              <div className="pm-power-label">{Math.round(panel.gen.power)}%</div>
            </div>
            <button
              className={`pm-btn ${genAlert ? 'pm-btn--alert-action' : ''}`}
              onClick={() => handleAction('generator_off')}
            >
              On / Off
            </button>
          </div>

          {/* Temperature */}
          <div className={`pm-zone ${tempAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">
              Temperature
              <span className="pm-spike-count">Spike: {spikes}/3</span>
            </div>
            <TempGraph history={panel.temp.history} value={panel.temp.value} />
            <div className="pm-temp-val">{Math.round(panel.temp.value)}°</div>
            <div className="pm-btn-row">
              <button
                className={`pm-btn ${tempAlert && spikes < 2 ? 'pm-btn--alert-action' : ''}`}
                onClick={() => handleAction('high')}
              >
                High
              </button>
              <button
                className={`pm-btn ${tempAlert && spikes === 2 ? 'pm-btn--alert-action' : ''}`}
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
          <div className={`pm-zone pm-zone--center ${sysAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">System Reset</div>
            <div className={`pm-sysreset-dial ${sysAlert ? 'pm-sysreset-dial--alert' : ''}`}>
              <div className="pm-sysreset-ring" />
              <div className="pm-sysreset-inner">↺</div>
            </div>
            <button
              className={`pm-btn ${sysAlert ? 'pm-btn--alert-action' : ''}`}
              onClick={() => handleAction('system_reset')}
            >
              System Reset
            </button>
          </div>

          {/* Gas */}
          <div className={`pm-zone ${(gasO2Alert || gasCO2Alert) ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">Gas Levels</div>
            <div className="pm-gas-bars">
              <GasBar label="O₂" level={panel.gas.o2} alert={gasO2Alert} />
              <GasBar label="CO₂" level={panel.gas.co2} alert={gasCO2Alert} />
            </div>
            <div className="pm-btn-row">
              <button
                className={`pm-btn ${(gasO2Alert || gasCO2Alert) && !alarmAlert ? 'pm-btn--alert-action' : ''}`}
                onClick={() => handleAction('gas_reset')}
              >
                Gas Reset
              </button>
              <button
                className={`pm-btn ${alarmAlert ? 'pm-btn--alert-action' : ''}`}
                onClick={() => handleAction('gas_alarm')}
              >
                Alarm
              </button>
            </div>
          </div>
        </div>

        {/* ── Col 3: Stabilizers ───────────────────────────────────────────── */}
        <div className="pm-col pm-col--stab">
          {/* North Stabilizer */}
          <div className={`pm-zone pm-zone--stab ${stabNAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">N Stabilizer</div>
            <StabDial angle={panel.stabN.angle} alert={stabNAlert} label1="N" label2="S" />
            <button
              className={`pm-btn ${stabNAlert && !recentreAlert ? 'pm-btn--alert-action' : ''}`}
              onClick={() => handleAction('stab_n')}
            >
              Reset N
            </button>
          </div>

          {/* Recentre */}
          <div className={`pm-zone pm-zone--recentre ${recentreAlert ? 'pm-zone--alert' : ''}`}>
            <button
              className={`pm-btn pm-btn--recentre ${recentreAlert ? 'pm-btn--alert-action' : ''}`}
              onClick={() => handleAction('stab_recentre')}
            >
              Recentre
            </button>
          </div>

          {/* West Stabilizer */}
          <div className={`pm-zone pm-zone--stab ${stabWAlert ? 'pm-zone--alert' : ''}`}>
            <div className="pm-zone__title">W Stabilizer</div>
            <StabDial angle={panel.stabW.angle} alert={stabWAlert} label1="W" label2="E" />
            <button
              className={`pm-btn ${stabWAlert && !recentreAlert ? 'pm-btn--alert-action' : ''}`}
              onClick={() => handleAction('stab_w')}
            >
              Reset W
            </button>
          </div>
        </div>

      </div>{/* end pm-panel */}

      <div className="pm-footer">
        Events: <strong>{hits + misses}</strong> · Correct: <strong>{hits}</strong> · Missed: <strong>{misses}</strong>
      </div>
      </div>
    </div>
  )
}
