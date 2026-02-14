import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Minus, Plus } from 'lucide-react'

const SVG_SIZE = 260
const CENTER = SVG_SIZE / 2
const OUTER_RADIUS = 86
const LABEL_RADIUS = 56
const HANDLE_RADIUS = OUTER_RADIUS + 10
const MIN_SEGMENT_PCT_DEFAULT = 5

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function toNumber(value, fallback = 0) {
    const next = Number(value)
    return Number.isFinite(next) ? next : fallback
}

function resolveColor(color, fallback) {
    const named = {
        blue: '#007ab3',
        green: '#63b209',
        red: '#f73c33',
        orange: '#f68016',
        amber: '#f68016',
        purple: '#7c3aed',
        teal: '#0d9488',
        sky: '#007ab3',
        slate: '#475569',
        indigo: '#4f46e5',
    }

    if (!color) return fallback
    if (color.startsWith('#')) return color
    return named[color.toLowerCase()] || fallback
}

function normalizeToHundred(values, ids) {
    const next = { ...values }
    const sum = ids.reduce((total, id) => total + toNumber(next[id], 0), 0)
    if (sum === 100) return next

    const adjustId = ids[0]
    next[adjustId] = toNumber(next[adjustId], 0) + (100 - sum)
    return next
}

function buildInitialPercentages(data, value) {
    const segments = Array.isArray(data?.segments) ? data.segments : []
    const ids = segments.map((segment) => segment.id)

    if (value && typeof value === 'object' && ids.every((id) => Number.isFinite(Number(value[id])))) {
        return normalizeToHundred(value, ids)
    }

    const fromData = segments.reduce((accumulator, segment) => {
        accumulator[segment.id] = toNumber(segment.initial_pct, 0)
        return accumulator
    }, {})

    return normalizeToHundred(fromData, ids)
}

function polarToCartesian(cx, cy, radius, angleRadians) {
    return {
        x: cx + radius * Math.cos(angleRadians),
        y: cy + radius * Math.sin(angleRadians),
    }
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, startAngle)
    const end = polarToCartesian(cx, cy, radius, endAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

    return [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
        'Z',
    ].join(' ')
}

function angleFromPercent(percent) {
    // 0% at top (-90deg), clockwise.
    return (percent / 100) * (Math.PI * 2) - Math.PI / 2
}

function percentFromAngle(angle) {
    // Inverse of angleFromPercent.
    let normalized = angle + Math.PI / 2
    const tau = Math.PI * 2
    while (normalized < 0) normalized += tau
    while (normalized >= tau) normalized -= tau
    return (normalized / tau) * 100
}

function getSvgPoint(svgEl, clientX, clientY) {
    const rect = svgEl.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * SVG_SIZE
    const y = ((clientY - rect.top) / rect.height) * SVG_SIZE
    return { x, y }
}

function applyDeltaToSegment(previous, segmentIds, targetId, delta, minPct) {
    const next = { ...previous }
    const current = toNumber(next[targetId], 0)
    const others = segmentIds.filter((id) => id !== targetId)

    if (others.length === 0) {
        next[targetId] = 100
        return normalizeToHundred(next, segmentIds)
    }

    if (delta > 0) {
        const maxIncrease = Math.min(delta, 100 - current)
        const available = others.reduce((sum, id) => sum + Math.max(0, toNumber(next[id], 0) - minPct), 0)
        let remaining = Math.min(maxIncrease, available)

        next[targetId] = current + remaining
        const reduceOrder = [...others].sort((a, b) => toNumber(next[b], 0) - toNumber(next[a], 0))

        for (const id of reduceOrder) {
            if (remaining <= 0) break
            const canTake = Math.max(0, toNumber(next[id], 0) - minPct)
            const take = Math.min(canTake, remaining)
            next[id] = toNumber(next[id], 0) - take
            remaining -= take
        }
    } else if (delta < 0) {
        const maxDecrease = Math.min(Math.abs(delta), Math.max(0, current - minPct))
        let remaining = maxDecrease
        next[targetId] = current - remaining

        const addOrder = [...others].sort((a, b) => toNumber(next[a], 0) - toNumber(next[b], 0))
        for (const id of addOrder) {
            if (remaining <= 0) break
            const capacity = 100 - toNumber(next[id], 0)
            const add = Math.min(capacity, remaining)
            next[id] = toNumber(next[id], 0) + add
            remaining -= add
        }
    }

    // Enforce minimum on all segments.
    segmentIds.forEach((id) => {
        next[id] = Math.max(minPct, toNumber(next[id], 0))
    })

    return normalizeToHundred(next, segmentIds)
}

export default function SHLResizablePieWidget({ data, value, onAnswer, disabled = false }) {
    const svgRef = useRef(null)
    const rafRef = useRef(null)
    const pendingPointRef = useRef(null)
    const [dragIndex, setDragIndex] = useState(null)

    const segments = Array.isArray(data?.segments) ? data.segments : []
    const segmentIds = segments.map((segment) => segment.id)
    const minPct = clamp(Math.round(toNumber(data?.min_pct, MIN_SEGMENT_PCT_DEFAULT)), 0, 20)
    const totalValue = toNumber(data?.total_value, 0)
    const initialFromData = buildInitialPercentages(data, null)

    const [percentages, setPercentages] = useState(() => buildInitialPercentages(data, value))

    const chartData = segments.map((segment, index) => {
        const percentage = toNumber(percentages[segment.id], 0)
        const fill = resolveColor(segment.color, ['#007ab3', '#63b209', '#f73c33', '#f68016', '#7c3aed'][index % 5])
        return {
            ...segment,
            percentage,
            value: Math.round(totalValue * (percentage / 100)),
            fill,
        }
    })

    const arcBuild = chartData.reduce(
        (accumulator, segment) => {
            const startPct = accumulator.cumulative
            const endPct = startPct + segment.percentage
            return {
                cumulative: endPct,
                arcs: accumulator.arcs.concat([{ startPct, endPct }]),
            }
        },
        { cumulative: 0, arcs: [] }
    )
    const boundaries = {
        arcs: arcBuild.arcs,
        handles: arcBuild.arcs.slice(0, -1).map((arc, index) => ({ index, percent: arc.endPct })),
    }

    function emit(next) {
        if (onAnswer) onAnswer(next)
    }

    function reset() {
        if (disabled) return
        const next = initialFromData
        setPercentages(next)
        emit(next)
    }

    function adjustSegment(targetId, delta) {
        if (disabled) return
        setPercentages((previous) => {
            const next = applyDeltaToSegment(previous, segmentIds, targetId, delta, minPct)
            emit(next)
            return next
        })
    }

    useEffect(() => {
        if (dragIndex === null || disabled) return undefined

        function applyPointerMove(clientX, clientY) {
            const svgEl = svgRef.current
            if (!svgEl) return
            const { x, y } = getSvgPoint(svgEl, clientX, clientY)

            const angle = Math.atan2(y - CENTER, x - CENTER)
            const boundaryPct = percentFromAngle(angle)

            setPercentages((previous) => {
                const ids = segmentIds
                if (ids.length < 2) return previous

                const i = dragIndex
                const leftId = ids[i]
                const rightId = ids[i + 1]

                const prevSum = ids.slice(0, i).reduce((sum, id) => sum + toNumber(previous[id], 0), 0)
                const pairSum = toNumber(previous[leftId], 0) + toNumber(previous[rightId], 0)
                if (pairSum <= 0) return previous

                const minBoundary = prevSum + minPct
                const maxBoundary = prevSum + pairSum - minPct
                const clampedBoundary = clamp(boundaryPct, minBoundary, maxBoundary)

                const nextLeft = clamp(Math.round(clampedBoundary - prevSum), minPct, pairSum - minPct)
                const nextRight = Math.max(minPct, pairSum - nextLeft)

                const next = { ...previous, [leftId]: nextLeft, [rightId]: nextRight }
                const normalized = normalizeToHundred(next, ids)
                if (onAnswer) onAnswer(normalized)
                return normalized
            })
        }

        function flushPendingMove() {
            if (!pendingPointRef.current) return
            const { x, y } = pendingPointRef.current
            pendingPointRef.current = null
            applyPointerMove(x, y)
        }

        function onPointerMove(event) {
            pendingPointRef.current = { x: event.clientX, y: event.clientY }
            if (rafRef.current !== null) return
            rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = null
                flushPendingMove()
            })
        }

        function onPointerUp() {
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
            flushPendingMove()
            setDragIndex(null)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
            pendingPointRef.current = null
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [disabled, dragIndex, minPct, onAnswer, segmentIds])

    const infoCards = Array.isArray(data?.info_cards) ? data.info_cards : null

    return (
        <section className="interactive-widget interactive-widget--pie">
            {infoCards && infoCards.length > 0 && (
                <div className="interactive-info-cards" aria-label="Information cards">
                    {infoCards.map((card, index) => {
                        const bg = resolveColor(card.color, ['#007ab3', '#63b209', '#f73c33', '#f68016'][index % 4])
                        return (
                            <div key={card.id || `${card.title}-${index}`} className="interactive-info-card" style={{ background: bg }}>
                                <div className="interactive-info-card__title">{card.title}</div>
                                {card.subtitle && <div className="interactive-info-card__subtitle">{card.subtitle}</div>}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="interactive-pie-shell">
                <div className="interactive-pie-actions">
                    <button
                        type="button"
                        className="interactive-reset-btn"
                        onClick={reset}
                        disabled={disabled}
                        aria-label="Reset pie chart"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>

                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                    className="interactive-pie-svg"
                    role="img"
                    aria-label="Interactive pie chart"
                >
                    {boundaries.arcs.map((arc, index) => {
                        const segment = chartData[index]
                        const startAngle = angleFromPercent(arc.startPct)
                        const endAngle = angleFromPercent(arc.endPct)
                        const midAngle = (startAngle + endAngle) / 2
                        const labelPoint = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, midAngle)

                        return (
                            <g key={segment.id}>
                                <path
                                    d={arcPath(CENTER, CENTER, OUTER_RADIUS, startAngle, endAngle)}
                                    fill={segment.fill}
                                    stroke="none"
                                    className="interactive-pie-slice"
                                    onPointerDown={(event) => {
                                        if (disabled) return
                                        if (segmentIds.length < 2) return

                                        event.preventDefault()

                                        const svgEl = svgRef.current
                                        if (!svgEl) return
                                        const { x, y } = getSvgPoint(svgEl, event.clientX, event.clientY)
                                        const angle = Math.atan2(y - CENTER, x - CENTER)
                                        const boundaryPct = percentFromAngle(angle)

                                        const sliceCount = segmentIds.length
                                        if (index === 0) {
                                            setDragIndex(0)
                                            return
                                        }

                                        if (index >= sliceCount - 1) {
                                            setDragIndex(Math.max(0, sliceCount - 2))
                                            return
                                        }

                                        const distToStart = Math.abs(boundaryPct - arc.startPct)
                                        const distToEnd = Math.abs(arc.endPct - boundaryPct)
                                        setDragIndex(distToStart < distToEnd ? index - 1 : index)
                                    }}
                                />
                                {segment.percentage >= 6 && (
                                    <text
                                        x={labelPoint.x}
                                        y={labelPoint.y}
                                        className="interactive-pie-label"
                                    >
                                        {Math.round(segment.percentage)}%
                                    </text>
                                )}
                            </g>
                        )
                    })}

                    {boundaries.handles.map((handle) => {
                        const angle = angleFromPercent(handle.percent)
                        const point = polarToCartesian(CENTER, CENTER, HANDLE_RADIUS, angle)
                        const isActive = dragIndex === handle.index
                        return (
                            <rect
                                key={`handle-${handle.index}`}
                                x={point.x - 6}
                                y={point.y - 6}
                                width="12"
                                height="12"
                                className={`interactive-pie-handle ${isActive ? 'interactive-pie-handle--active' : ''}`}
                                onPointerDown={() => !disabled && setDragIndex(handle.index)}
                            />
                        )
                    })}
                </svg>
            </div>

            <div className="interactive-pie-legend" aria-label="Pie chart breakdown">
                {chartData.map((segment) => (
                    <div className="interactive-pie-legend__row" key={segment.id}>
                        <span className="interactive-legend__swatch" style={{ backgroundColor: segment.fill }} />
                        <span className="interactive-legend__label">{segment.label}</span>
                        <span className="interactive-legend__meta">{segment.percentage}%</span>
                        <span className="interactive-legend__meta">{segment.value}</span>
                        <div className="interactive-legend__actions">
                            <button
                                type="button"
                                className="interactive-step-btn"
                                onClick={() => adjustSegment(segment.id, -1)}
                                disabled={disabled || segment.percentage <= minPct}
                                aria-label={`Decrease ${segment.label}`}
                            >
                                <Minus size={14} />
                            </button>
                            <button
                                type="button"
                                className="interactive-step-btn"
                                onClick={() => adjustSegment(segment.id, 1)}
                                disabled={disabled}
                                aria-label={`Increase ${segment.label}`}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                <div className="interactive-pie-legend__hint">
                    Minimum slice: {minPct}% (SHL constraint)
                </div>
            </div>
        </section>
    )
}
