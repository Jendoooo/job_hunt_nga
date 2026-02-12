import { useEffect, useMemo, useRef, useState } from 'react'

const SVG_WIDTH = 360
const SVG_HEIGHT = 280
const PLOT_TOP = 24
const PLOT_BOTTOM = 244
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP
const BAR_WIDTH = 56
const BAR_ONE_X = 96
const BAR_TWO_X = 228

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

function calculateInitialState(data, value) {
    const initial = data?.bar_2_initial || {}

    if (value && typeof value === 'object') {
        const total = toNumber(value.total, toNumber(initial.total, 0))
        const splitPct = toNumber(value.split_pct, toNumber(initial.split_pct, 50))
        return { total, splitPct }
    }

    return {
        total: toNumber(initial.total, 0),
        splitPct: toNumber(initial.split_pct, 50),
    }
}

export default function SHLAdjustableBarWidget({ data, value, onAnswer, disabled = false }) {
    const svgRef = useRef(null)
    const [dragMode, setDragMode] = useState(null)
    const [{ total, splitPct }, setState] = useState(() => calculateInitialState(data, value))
    const axisMax = toNumber(data?.axis_max, 100)
    const reference = useMemo(() => data?.bar_1 || { total: 0, split_pct: 50 }, [data?.bar_1])

    useEffect(() => {
        setState(calculateInitialState(data, value))
    }, [data, value])

    useEffect(() => {
        if (!onAnswer) return
        onAnswer({
            total: Math.round(total),
            split_pct: Math.round(splitPct),
        })
    }, [onAnswer, splitPct, total])

    function getSvgY(clientY) {
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return null
        const scaled = ((clientY - rect.top) / rect.height) * SVG_HEIGHT
        return clamp(scaled, PLOT_TOP, PLOT_BOTTOM)
    }

    useEffect(() => {
        if (!dragMode || disabled) return

        function onPointerMove(event) {
            const chartY = getSvgY(event.clientY)
            if (chartY === null) return

            setState((previous) => {
                if (dragMode === 'total') {
                    const nextTotal = clamp(Math.round(((PLOT_BOTTOM - chartY) / PLOT_HEIGHT) * axisMax), 1, axisMax)
                    return { ...previous, total: nextTotal }
                }

                if (dragMode === 'split') {
                    const serviceValue = clamp(((PLOT_BOTTOM - chartY) / PLOT_HEIGHT) * axisMax, 0, previous.total)
                    const nextSplit = previous.total > 0
                        ? clamp(Math.round((serviceValue / previous.total) * 100), 0, 100)
                        : 0
                    return { ...previous, splitPct: nextSplit }
                }

                return previous
            })
        }

        function onPointerUp() {
            setDragMode(null)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [axisMax, disabled, dragMode])

    const chart = useMemo(() => {
        const refTotal = toNumber(reference.total, 0)
        const refSplit = toNumber(reference.split_pct, 50)
        const refService = (refTotal * refSplit) / 100
        const refProduct = refTotal - refService

        const currentService = (total * splitPct) / 100
        const currentProduct = total - currentService

        const refHeight = valueToHeight(refTotal, axisMax)
        const refServiceHeight = valueToHeight(refService, axisMax)
        const refProductHeight = valueToHeight(refProduct, axisMax)

        const currentHeight = valueToHeight(total, axisMax)
        const currentServiceHeight = valueToHeight(currentService, axisMax)
        const currentProductHeight = valueToHeight(currentProduct, axisMax)

        const currentTopY = PLOT_BOTTOM - currentHeight
        const currentSplitY = PLOT_BOTTOM - currentServiceHeight

        return {
            refHeight,
            refServiceHeight,
            refProductHeight,
            currentHeight,
            currentServiceHeight,
            currentProductHeight,
            currentTopY,
            currentSplitY,
            currentService,
            currentProduct,
        }
    }, [axisMax, reference, splitPct, total])

    return (
        <section className="interactive-widget interactive-widget--bar">
            <svg ref={svgRef} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="interactive-bar-chart" role="img" aria-label="Interactive stacked bar chart">
                <line x1="56" y1={PLOT_TOP} x2="56" y2={PLOT_BOTTOM} className="interactive-axis" />
                <line x1="56" y1={PLOT_BOTTOM} x2="324" y2={PLOT_BOTTOM} className="interactive-axis" />

                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const y = PLOT_BOTTOM - (PLOT_HEIGHT * fraction)
                    const valueLabel = Math.round(axisMax * fraction)
                    return (
                        <g key={fraction}>
                            <line x1="56" y1={y} x2="324" y2={y} className="interactive-grid-line" />
                            <text x="48" y={y + 4} className="interactive-axis-label">{valueLabel}</text>
                        </g>
                    )
                })}

                <g>
                    <rect
                        x={BAR_ONE_X}
                        y={PLOT_BOTTOM - chart.refServiceHeight}
                        width={BAR_WIDTH}
                        height={chart.refServiceHeight}
                        className="interactive-segment interactive-segment--service"
                    />
                    <rect
                        x={BAR_ONE_X}
                        y={PLOT_BOTTOM - chart.refHeight}
                        width={BAR_WIDTH}
                        height={chart.refProductHeight}
                        className="interactive-segment interactive-segment--product"
                    />
                    <text x={BAR_ONE_X + BAR_WIDTH / 2} y={PLOT_BOTTOM + 24} className="interactive-axis-caption">Month 1</text>
                </g>

                <g>
                    <rect
                        x={BAR_TWO_X}
                        y={PLOT_BOTTOM - chart.currentServiceHeight}
                        width={BAR_WIDTH}
                        height={chart.currentServiceHeight}
                        className="interactive-segment interactive-segment--service interactive-segment--interactive"
                    />
                    <rect
                        x={BAR_TWO_X}
                        y={PLOT_BOTTOM - chart.currentHeight}
                        width={BAR_WIDTH}
                        height={chart.currentProductHeight}
                        className="interactive-segment interactive-segment--product interactive-segment--interactive"
                    />
                    <text x={BAR_TWO_X + BAR_WIDTH / 2} y={PLOT_BOTTOM + 24} className="interactive-axis-caption">Month 2</text>

                    <circle
                        cx={BAR_TWO_X + BAR_WIDTH / 2}
                        cy={chart.currentTopY}
                        r="8"
                        className={`interactive-handle ${dragMode === 'total' ? 'interactive-handle--active' : ''}`}
                        onPointerDown={() => !disabled && setDragMode('total')}
                    />
                    <circle
                        cx={BAR_TWO_X + BAR_WIDTH / 2}
                        cy={chart.currentSplitY}
                        r="8"
                        className={`interactive-handle ${dragMode === 'split' ? 'interactive-handle--active' : ''}`}
                        onPointerDown={() => !disabled && setDragMode('split')}
                    />
                </g>
            </svg>

            <div className="interactive-bar-meta">
                <div>
                    <strong>Total:</strong> {Math.round(total)}
                </div>
                <div>
                    <strong>Service:</strong> {Math.round(splitPct)}%
                </div>
                <div>
                    <strong>Product:</strong> {Math.max(0, 100 - Math.round(splitPct))}%
                </div>
                <div>
                    <strong>Split values:</strong> {Math.round(chart.currentService)} / {Math.round(chart.currentProduct)}
                </div>
            </div>
        </section>
    )
}
