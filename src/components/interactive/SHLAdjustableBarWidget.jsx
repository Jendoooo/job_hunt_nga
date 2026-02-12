import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SVG_WIDTH = 440
const SVG_HEIGHT = 360
const PLOT_TOP = 24
const PLOT_BOTTOM = 236
const PLOT_LEFT = 72
const PLOT_RIGHT = 416
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP
const X_AXIS_LABEL_OFFSET = 40
const TOTAL_LABEL_OFFSET = 10

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function toNumber(value, fallback = 0) {
    const next = Number(value)
    return Number.isFinite(next) ? next : fallback
}

function valueToHeight(value, axisMin, axisMax) {
    const range = axisMax - axisMin
    if (range <= 0) return 0
    return ((clamp(value, axisMin, axisMax) - axisMin) / range) * PLOT_HEIGHT
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
    const configuredAxisMin = toNumber(data?.axis_min, 0)
    const configuredAxisStep = toNumber(data?.axis_step, 0)
    const axisPrefix = typeof data?.axis_prefix === 'string' ? data.axis_prefix : ''
    const axisSuffix = typeof data?.axis_suffix === 'string' ? data.axis_suffix : ''
    const totalPrefix = typeof data?.total_prefix === 'string' ? data.total_prefix : ''

    const labelSource = data?.segment_labels || data?.labels || {}
    const primaryLabel = labelSource?.primary || labelSource?.bottom || 'Service'
    const secondaryLabel = labelSource?.secondary || labelSource?.top || 'Product'

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
    const axisMin = Math.min(axisMax - 1, configuredAxisMin)
    const axisRange = axisMax - axisMin

    const initialState = Object.entries(requestedState).reduce((accumulator, [barId, state]) => {
        accumulator[barId] = {
            total: clamp(toNumber(state?.total, 0), axisMin, axisMax),
            split_pct: clamp(toNumber(state?.split_pct, 50), 0, 100),
        }
        return accumulator
    }, {})

    return {
        axisMin,
        axisMax,
        axisRange,
        axisStep: configuredAxisStep > 0 ? configuredAxisStep : null,
        axisPrefix,
        axisSuffix,
        totalPrefix,
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
                const ratio = (PLOT_BOTTOM - chartY) / PLOT_HEIGHT

                let nextEntry = current
                if (dragMode.kind === 'total') {
                    nextEntry = {
                        ...current,
                        total: clamp(
                            Math.round(config.axisMin + ratio * config.axisRange),
                            config.axisMin,
                            config.axisMax
                        ),
                    }
                }

                if (dragMode.kind === 'split') {
                    const valueAtPointer = config.axisMin + ratio * config.axisRange
                    const primaryValue = clamp(valueAtPointer, config.axisMin, current.total)
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
    }, [config.axisMax, config.axisMin, config.axisRange, disabled, dragMode, emitAnswer])

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
        const slotWidth = count === 0 ? span : span / count
        const barWidthBase = clamp(Math.round(slotWidth * 0.6), 46, 86)
        const barWidth = Math.min(barWidthBase, Math.max(24, Math.round(slotWidth - 18)))

        return allBars.map((bar, index) => {
            const centerX = PLOT_LEFT + (slotWidth * (index + 0.5))
            const x = centerX - barWidth / 2
            const total = clamp(toNumber(bar.total, 0), config.axisMin, config.axisMax)
            const splitPct = clamp(toNumber(bar.split_pct, 50), 0, 100)

            const primaryValue = (total * splitPct) / 100
            const secondaryValue = total - primaryValue

            const totalHeight = valueToHeight(total, config.axisMin, config.axisMax)
            const primaryHeight = valueToHeight(primaryValue, config.axisMin, config.axisMax)
            const secondaryHeight = valueToHeight(secondaryValue, config.axisMin, config.axisMax)

            const topY = PLOT_BOTTOM - totalHeight
            const splitY = PLOT_BOTTOM - primaryHeight

            return {
                ...bar,
                centerX,
                x,
                barWidth,
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
    }, [allBars, config.axisMax, config.axisMin])

    const activeBar = dragMode
        ? chartBars.find((bar) => bar.id === dragMode.barId)
        : null

    const axisTicks = useMemo(() => {
        const ticks = []

        if (config.axisStep && config.axisStep > 0) {
            for (let v = config.axisMin; v <= config.axisMax; v += config.axisStep) {
                ticks.push(v)
            }
            if (ticks[ticks.length - 1] !== config.axisMax) {
                ticks.push(config.axisMax)
            }
            return ticks
        }

        // Default: 5 ticks including min/max.
        const steps = 4
        for (let i = 0; i <= steps; i += 1) {
            ticks.push(Math.round(config.axisMin + (config.axisRange * i) / steps))
        }
        return ticks
    }, [config.axisMax, config.axisMin, config.axisRange, config.axisStep])

    function formatAxisValue(valueLabel) {
        const numberLabel = Number(valueLabel).toLocaleString()
        return `${config.axisPrefix}${numberLabel}${config.axisSuffix}`
    }

    return (
        <section className="interactive-widget interactive-widget--bar">
            <svg ref={svgRef} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="interactive-bar-chart" role="img" aria-label="Interactive stacked bar chart">
                <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={PLOT_BOTTOM} className="interactive-axis" />
                <line x1={PLOT_LEFT} y1={PLOT_BOTTOM} x2={PLOT_RIGHT} y2={PLOT_BOTTOM} className="interactive-axis" />

                {axisTicks.map((tickValue) => {
                    const tickHeight = valueToHeight(tickValue, config.axisMin, config.axisMax)
                    const y = PLOT_BOTTOM - tickHeight
                    return (
                        <g key={tickValue}>
                            <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} className="interactive-grid-line" />
                            <text x={PLOT_LEFT - 8} y={y + 4} className="interactive-axis-label">{formatAxisValue(tickValue)}</text>
                        </g>
                    )
                })}

                {chartBars.map((bar) => (
                    <g key={bar.id}>
                        <text x={bar.centerX} y={bar.topY - TOTAL_LABEL_OFFSET} className="interactive-bar-total">
                            {config.totalPrefix}{Math.round(bar.total).toLocaleString()}
                        </text>
                        <rect
                            x={bar.x}
                            y={PLOT_BOTTOM - bar.primaryHeight}
                            width={bar.barWidth}
                            height={bar.primaryHeight}
                            className={`interactive-segment interactive-segment--service ${bar.interactive ? 'interactive-segment--interactive' : ''}`}
                        />
                        <rect
                            x={bar.x}
                            y={bar.topY}
                            width={bar.barWidth}
                            height={bar.secondaryHeight}
                            className={`interactive-segment interactive-segment--product ${bar.interactive ? 'interactive-segment--interactive' : ''}`}
                        />
                        {bar.primaryHeight > 0 && bar.secondaryHeight > 0 && (
                            <line
                                x1={bar.x}
                                y1={bar.splitY}
                                x2={bar.x + bar.barWidth}
                                y2={bar.splitY}
                                stroke="#ffffff"
                                strokeWidth="2"
                            />
                        )}
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
                                <rect
                                    x={bar.centerX - 7}
                                    y={bar.topY - 7}
                                    width="14"
                                    height="14"
                                    className={`interactive-handle ${dragMode?.barId === bar.id && dragMode.kind === 'total' ? 'interactive-handle--active' : ''}`}
                                    onPointerDown={() => !disabled && setDragMode({ barId: bar.id, kind: 'total' })}
                                />
                                <rect
                                    x={bar.centerX - 7}
                                    y={bar.splitY - 7}
                                    width="14"
                                    height="14"
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
                            ? `Total: ${formatAxisValue(Math.round(activeBar.total))}`
                            : `${config.primaryLabel}: ${Math.round(activeBar.splitPct)}%`}
                    </text>
                )}
            </svg>

            <div className="interactive-bar-legend" aria-hidden="true">
                <div className="interactive-bar-legend__item">
                    <span className="interactive-bar-legend__swatch interactive-bar-legend__swatch--primary" />
                    <span>{config.primaryLabel}</span>
                </div>
                <div className="interactive-bar-legend__item">
                    <span className="interactive-bar-legend__swatch interactive-bar-legend__swatch--secondary" />
                    <span>{config.secondaryLabel}</span>
                </div>
            </div>
        </section>
    )
}
