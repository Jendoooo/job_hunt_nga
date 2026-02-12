import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SVG_WIDTH = 440
const SVG_HEIGHT = 360
const PLOT_TOP = 24
const PLOT_BOTTOM = 236
const PLOT_LEFT = 72
const PLOT_RIGHT = 416
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP
const BAR_WIDTH = 56
const X_AXIS_LABEL_OFFSET = 40

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function toNumber(value, fallback = 0) {
    const next = Number(value)
    return Number.isFinite(next) ? next : fallback
}

function valueToHeight(value, axisMax) {
    if (axisMax <= 0) return 0
    return (clamp(value, 0, axisMax) / axisMax) * PLOT_HEIGHT
}

function normalizeBar(bar, fallbackLabel) {
    return {
        id: bar?.id || fallbackLabel.toLowerCase().replace(/\s+/g, '_'),
        label: bar?.label || fallbackLabel,
        total: toNumber(bar?.total, 0),
        split_pct: clamp(toNumber(bar?.split_pct, 50), 0, 100),
    }
}

function buildWidgetConfig(data, value) {
    const configuredAxisMax = toNumber(data?.axis_max, 100)
    const primaryLabel = data?.segment_labels?.primary || 'Service'
    const secondaryLabel = data?.segment_labels?.secondary || 'Product'

    let referenceBars = []
    if (Array.isArray(data?.reference_bars) && data.reference_bars.length > 0) {
        referenceBars = data.reference_bars.map((bar, index) => normalizeBar(bar, `Reference ${index + 1}`))
    } else if (data?.reference_bar) {
        referenceBars = [normalizeBar(data.reference_bar, 'Reference')]
    } else if (data?.bar_1) {
        referenceBars = [normalizeBar(data.bar_1, 'Month 1')]
    }

    let interactiveBars = []
    if (Array.isArray(data?.interactive_bars) && data.interactive_bars.length > 0) {
        interactiveBars = data.interactive_bars.map((bar, index) => normalizeBar(bar, `Month ${index + 2}`))
    } else {
        interactiveBars = [normalizeBar(data?.bar_2_initial || {}, 'Month 2')]
    }

    const baseMaxTotal = [...referenceBars, ...interactiveBars].reduce((maxTotal, bar) => {
        return Math.max(maxTotal, toNumber(bar?.total, 0))
    }, 0)

    const requestedState = interactiveBars.reduce((accumulator, bar) => {
        const valueCandidate = interactiveBars.length === 1
            ? value
            : (value && typeof value === 'object' ? value[bar.id] : null)
        const entry = valueCandidate && typeof valueCandidate === 'object'
            ? valueCandidate
            : null

        accumulator[bar.id] = {
            total: toNumber(entry?.total, bar.total),
            split_pct: clamp(toNumber(entry?.split_pct, bar.split_pct), 0, 100),
        }

        return accumulator
    }, {})

    const requestedMaxTotal = Object.values(requestedState).reduce((maxTotal, state) => {
        return Math.max(maxTotal, toNumber(state?.total, 0))
    }, 0)

    const bufferedAxisMax = Math.ceil(Math.max(baseMaxTotal, requestedMaxTotal) * 1.1)
    const axisMax = Math.max(10, configuredAxisMax, bufferedAxisMax)

    const initialState = Object.entries(requestedState).reduce((accumulator, [barId, state]) => {
        accumulator[barId] = {
            total: clamp(toNumber(state?.total, 0), 1, axisMax),
            split_pct: clamp(toNumber(state?.split_pct, 50), 0, 100),
        }
        return accumulator
    }, {})

    return {
        axisMax,
        primaryLabel,
        secondaryLabel,
        referenceBars,
        interactiveBars,
        initialState,
    }
}

function normalizeOutput(stateById, interactiveBars, multiOutput) {
    if (multiOutput) {
        return interactiveBars.reduce((accumulator, bar) => {
            const entry = stateById[bar.id] || { total: 0, split_pct: 0 }
            accumulator[bar.id] = {
                total: Math.round(entry.total),
                split_pct: Math.round(entry.split_pct),
            }
            return accumulator
        }, {})
    }

    const barId = interactiveBars[0]?.id
    const entry = stateById[barId] || { total: 0, split_pct: 0 }
    return {
        total: Math.round(entry.total),
        split_pct: Math.round(entry.split_pct),
    }
}

export default function SHLAdjustableBarWidget({ data, value, onAnswer, disabled = false }) {
    const svgRef = useRef(null)
    const rafIdRef = useRef(null)
    const pendingClientYRef = useRef(null)
    const [dragMode, setDragMode] = useState(null)
    const config = useMemo(() => buildWidgetConfig(data, value), [data, value])
    const [barState, setBarState] = useState(() => config.initialState)
    const multiOutput = config.interactiveBars.length > 1 || (Array.isArray(data?.interactive_bars) && data.interactive_bars.length > 0)

    const emitAnswer = useCallback((nextState) => {
        if (!onAnswer) return
        onAnswer(normalizeOutput(nextState, config.interactiveBars, multiOutput))
    }, [config.interactiveBars, multiOutput, onAnswer])

    function getSvgY(clientY) {
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return null
        const scaled = ((clientY - rect.top) / rect.height) * SVG_HEIGHT
        return clamp(scaled, PLOT_TOP, PLOT_BOTTOM)
    }

    useEffect(() => {
        if (!dragMode || disabled) return

        function applyPointerMove(clientY) {
            const chartY = getSvgY(clientY)
            if (chartY === null) return

            setBarState((previous) => {
                const current = previous[dragMode.barId]
                if (!current) return previous

                let nextEntry = current
                if (dragMode.kind === 'total') {
                    nextEntry = {
                        ...current,
                        total: clamp(Math.round(((PLOT_BOTTOM - chartY) / PLOT_HEIGHT) * config.axisMax), 1, config.axisMax),
                    }
                }

                if (dragMode.kind === 'split') {
                    const primaryValue = clamp(((PLOT_BOTTOM - chartY) / PLOT_HEIGHT) * config.axisMax, 0, current.total)
                    const nextSplit = current.total > 0
                        ? clamp(Math.round((primaryValue / current.total) * 100), 0, 100)
                        : 0
                    nextEntry = {
                        ...current,
                        split_pct: nextSplit,
                    }
                }

                if (nextEntry.total === current.total && nextEntry.split_pct === current.split_pct) {
                    return previous
                }

                const nextState = {
                    ...previous,
                    [dragMode.barId]: nextEntry,
                }
                emitAnswer(nextState)
                return nextState
            })
        }

        function flushPendingMove() {
            if (pendingClientYRef.current === null) return
            const clientY = pendingClientYRef.current
            pendingClientYRef.current = null
            applyPointerMove(clientY)
        }

        function onPointerMove(event) {
            pendingClientYRef.current = event.clientY
            if (rafIdRef.current !== null) return

            rafIdRef.current = window.requestAnimationFrame(() => {
                rafIdRef.current = null
                flushPendingMove()
            })
        }

        function onPointerUp() {
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
            flushPendingMove()
            setDragMode(null)
        }

        pendingClientYRef.current = null
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
            pendingClientYRef.current = null
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [config.axisMax, disabled, dragMode, emitAnswer])

    const allBars = useMemo(() => {
        const references = config.referenceBars.map((bar) => ({
            ...bar,
            interactive: false,
        }))

        const interactives = config.interactiveBars.map((bar) => ({
            ...bar,
            interactive: true,
            total: barState[bar.id]?.total ?? bar.total,
            split_pct: barState[bar.id]?.split_pct ?? bar.split_pct,
        }))

        return [...references, ...interactives]
    }, [barState, config.interactiveBars, config.referenceBars])

    const chartBars = useMemo(() => {
        const count = Math.max(allBars.length, 1)
        const span = PLOT_RIGHT - PLOT_LEFT
        const step = count === 1 ? 0 : span / (count - 1)

        return allBars.map((bar, index) => {
            const centerX = PLOT_LEFT + (step * index)
            const x = centerX - BAR_WIDTH / 2
            const total = clamp(toNumber(bar.total, 0), 0, config.axisMax)
            const splitPct = clamp(toNumber(bar.split_pct, 50), 0, 100)

            const primaryValue = (total * splitPct) / 100
            const secondaryValue = total - primaryValue

            const totalHeight = valueToHeight(total, config.axisMax)
            const primaryHeight = valueToHeight(primaryValue, config.axisMax)
            const secondaryHeight = valueToHeight(secondaryValue, config.axisMax)

            const topY = PLOT_BOTTOM - totalHeight
            const splitY = PLOT_BOTTOM - primaryHeight

            return {
                ...bar,
                centerX,
                x,
                total,
                splitPct,
                primaryValue,
                secondaryValue,
                totalHeight,
                primaryHeight,
                secondaryHeight,
                topY,
                splitY,
            }
        })
    }, [allBars, config.axisMax])

    const activeBar = dragMode
        ? chartBars.find((bar) => bar.id === dragMode.barId)
        : null

    return (
        <section className="interactive-widget interactive-widget--bar">
            <svg ref={svgRef} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="interactive-bar-chart" role="img" aria-label="Interactive stacked bar chart">
                <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={PLOT_BOTTOM} className="interactive-axis" />
                <line x1={PLOT_LEFT} y1={PLOT_BOTTOM} x2={PLOT_RIGHT} y2={PLOT_BOTTOM} className="interactive-axis" />

                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const y = PLOT_BOTTOM - (PLOT_HEIGHT * fraction)
                    const valueLabel = Math.round(config.axisMax * fraction)
                    return (
                        <g key={fraction}>
                            <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} className="interactive-grid-line" />
                            <text x={PLOT_LEFT - 8} y={y + 4} className="interactive-axis-label">{valueLabel}</text>
                        </g>
                    )
                })}

                {chartBars.map((bar) => (
                    <g key={bar.id}>
                        <rect
                            x={bar.x}
                            y={PLOT_BOTTOM - bar.primaryHeight}
                            width={BAR_WIDTH}
                            height={bar.primaryHeight}
                            className={`interactive-segment interactive-segment--service ${bar.interactive ? 'interactive-segment--interactive' : ''}`}
                        />
                        <rect
                            x={bar.x}
                            y={bar.topY}
                            width={BAR_WIDTH}
                            height={bar.secondaryHeight}
                            className={`interactive-segment interactive-segment--product ${bar.interactive ? 'interactive-segment--interactive' : ''}`}
                        />
                        <text x={bar.centerX} y={PLOT_BOTTOM + X_AXIS_LABEL_OFFSET} className="interactive-axis-caption">{bar.label}</text>

                        {bar.primaryHeight >= 18 && (
                            <text
                                x={bar.centerX}
                                y={PLOT_BOTTOM - bar.primaryHeight / 2}
                                className="interactive-segment-label"
                            >
                                {Math.round(bar.splitPct)}%
                            </text>
                        )}
                        {bar.secondaryHeight >= 18 && (
                            <text
                                x={bar.centerX}
                                y={bar.topY + bar.secondaryHeight / 2}
                                className="interactive-segment-label"
                            >
                                {Math.max(0, 100 - Math.round(bar.splitPct))}%
                            </text>
                        )}

                        {bar.interactive && (
                            <>
                                <circle
                                    cx={bar.centerX}
                                    cy={bar.topY}
                                    r="20"
                                    className={`interactive-handle ${dragMode?.barId === bar.id && dragMode.kind === 'total' ? 'interactive-handle--active' : ''}`}
                                    onPointerDown={() => !disabled && setDragMode({ barId: bar.id, kind: 'total' })}
                                />
                                <circle
                                    cx={bar.centerX}
                                    cy={bar.splitY}
                                    r="20"
                                    className={`interactive-handle ${dragMode?.barId === bar.id && dragMode.kind === 'split' ? 'interactive-handle--active' : ''}`}
                                    onPointerDown={() => !disabled && setDragMode({ barId: bar.id, kind: 'split' })}
                                />
                            </>
                        )}
                    </g>
                ))}

                {activeBar && (
                    <text
                        x={activeBar.centerX + 12}
                        y={dragMode.kind === 'total' ? activeBar.topY - 10 : activeBar.splitY - 10}
                        className="interactive-tooltip-text"
                    >
                        {dragMode.kind === 'total'
                            ? `Total: ${Math.round(activeBar.total)}`
                            : `${config.primaryLabel}: ${Math.round(activeBar.splitPct)}%`}
                    </text>
                )}
            </svg>

        </section>
    )
}
