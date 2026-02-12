import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SVG_WIDTH = 440
const SVG_HEIGHT = 280
const PLOT_TOP = 20
const PLOT_BOTTOM = 230
const PLOT_LEFT = 88
const PLOT_RIGHT = 420
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP
const POINT_RADIUS = 9
const SHL_GREEN = '#63b209'

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function formatYLabel(value, labelHint) {
    if (labelHint && labelHint.includes('$')) {
        return `$${Number(value).toLocaleString()}`
    }
    return String(Math.round(value))
}

function normalizeValues(value, initialValues, expectedLength) {
    const candidate = Array.isArray(value)
        ? value
        : (value && typeof value === 'object' && Array.isArray(value.values) ? value.values : null)

    if (Array.isArray(candidate) && candidate.length === expectedLength) {
        return [...candidate]
    }

    const nextInitial = Array.isArray(initialValues) ? initialValues : []
    if (nextInitial.length === expectedLength) {
        return [...nextInitial]
    }

    return Array.from({ length: expectedLength }, () => 0)
}

export default function SHLPointGraphWidget({ data, value, onAnswer, disabled = false }) {
    const yAxis = data?.y_axis && typeof data.y_axis === 'object'
        ? data.y_axis
        : { min: 0, max: 100, step: 10, label: '' }
    const xLabels = Array.isArray(data?.x_axis_labels) ? data.x_axis_labels : []
    const initialValues = Array.isArray(data?.initial_values)
        ? data.initial_values
        : xLabels.map(() => yAxis.min)

    const yMin = Number.isFinite(Number(yAxis.min)) ? Number(yAxis.min) : 0
    const yMaxRaw = Number.isFinite(Number(yAxis.max)) ? Number(yAxis.max) : 100
    const yMax = yMaxRaw > yMin ? yMaxRaw : yMin + 1
    const yRange = yMax - yMin
    const step = Number.isFinite(Number(yAxis.step)) && Number(yAxis.step) > 0 ? Number(yAxis.step) : 1

    const [values, setValues] = useState(() => normalizeValues(value, initialValues, xLabels.length))
    const [draggingIndex, setDraggingIndex] = useState(null)

    const svgRef = useRef(null)
    const rafRef = useRef(null)
    const pendingClientYRef = useRef(null)

    const valueToSvgY = useCallback((rawValue) => {
        const ratio = (clamp(rawValue, yMin, yMax) - yMin) / yRange
        return PLOT_BOTTOM - ratio * PLOT_HEIGHT
    }, [yMax, yMin, yRange])

    const svgYToValue = useCallback((svgY) => {
        const ratio = (PLOT_BOTTOM - clamp(svgY, PLOT_TOP, PLOT_BOTTOM)) / PLOT_HEIGHT
        const rawValue = yMin + ratio * yRange
        return clamp(Math.round(rawValue / step) * step, yMin, yMax)
    }, [step, yMax, yMin, yRange])

    const yTicks = useMemo(() => {
        const ticks = []
        for (let valueTick = yMin; valueTick <= yMax; valueTick += step) {
            ticks.push(valueTick)
        }

        if (ticks[ticks.length - 1] !== yMax) {
            ticks.push(yMax)
        }

        return ticks
    }, [step, yMax, yMin])

    const count = xLabels.length
    const xStep = count <= 1 ? 0 : (PLOT_RIGHT - PLOT_LEFT) / (count - 1)
    const xPositions = xLabels.map((_, index) => PLOT_LEFT + index * xStep)

    useEffect(() => {
        if (draggingIndex === null || disabled) return undefined

        function applyPointerMove(clientY) {
            const rect = svgRef.current?.getBoundingClientRect()
            if (!rect) return

            const svgY = ((clientY - rect.top) / rect.height) * SVG_HEIGHT
            const nextValue = svgYToValue(svgY)

            setValues((previous) => {
                const next = [...previous]
                if (next[draggingIndex] === nextValue) return previous
                next[draggingIndex] = nextValue
                if (onAnswer) onAnswer({ values: next })
                return next
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
            setDraggingIndex(null)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
            pendingClientYRef.current = null
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [disabled, draggingIndex, onAnswer, svgYToValue])

    const polylinePoints = xPositions
        .map((x, index) => `${x},${valueToSvgY(values[index] ?? yMin)}`)
        .join(' ')

    return (
        <section className="interactive-widget interactive-widget--graph">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="interactive-point-graph"
                role="img"
                aria-label="Interactive line graph"
            >
                {yTicks.map((tick) => {
                    const y = valueToSvgY(tick)
                    return (
                        <g key={tick}>
                            <line
                                x1={PLOT_LEFT}
                                y1={y}
                                x2={PLOT_RIGHT}
                                y2={y}
                                className="interactive-grid-line"
                            />
                            <text
                                x={PLOT_LEFT - 6}
                                y={y + 4}
                                className="interactive-axis-label"
                            >
                                {formatYLabel(tick, yAxis.label)}
                            </text>
                        </g>
                    )
                })}

                <line
                    x1={PLOT_LEFT}
                    y1={PLOT_BOTTOM}
                    x2={PLOT_RIGHT}
                    y2={PLOT_BOTTOM}
                    className="interactive-axis"
                />

                {xLabels.map((label, index) => (
                    <text
                        key={`${label}-${index}`}
                        x={xPositions[index]}
                        y={PLOT_BOTTOM + 20}
                        className="interactive-axis-caption"
                    >
                        {label}
                    </text>
                ))}

                {xPositions.length > 1 && (
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={SHL_GREEN}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />
                )}

                {values.map((pointValue, index) => (
                    <circle
                        key={`point-${index}`}
                        cx={xPositions[index]}
                        cy={valueToSvgY(pointValue)}
                        r={POINT_RADIUS}
                        fill={SHL_GREEN}
                        className="graph-point"
                        onPointerDown={() => !disabled && setDraggingIndex(index)}
                    />
                ))}

                {draggingIndex !== null && (
                    <text
                        x={xPositions[draggingIndex] + 14}
                        y={valueToSvgY(values[draggingIndex]) - 10}
                        className="interactive-tooltip-text"
                    >
                        {formatYLabel(values[draggingIndex], yAxis.label)}
                    </text>
                )}
            </svg>
        </section>
    )
}
