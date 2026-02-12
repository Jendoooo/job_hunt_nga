import { useEffect, useMemo, useState } from 'react'
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { Minus, Plus } from 'lucide-react'

function toNumber(value, fallback = 0) {
    const next = Number(value)
    return Number.isFinite(next) ? next : fallback
}

function resolveColor(color, fallback) {
    const named = {
        blue: '#2563eb',
        green: '#16a34a',
        orange: '#ea580c',
        amber: '#d97706',
        red: '#dc2626',
        purple: '#7c3aed',
        teal: '#0d9488',
        sky: '#0284c7',
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

export default function SHLResizablePieWidget({ data, value, onAnswer, disabled = false }) {
    const segments = useMemo(() => (Array.isArray(data?.segments) ? data.segments : []), [data?.segments])
    const segmentIds = useMemo(() => segments.map((segment) => segment.id), [segments])
    const [percentages, setPercentages] = useState(() => buildInitialPercentages(data, value))
    const totalValue = toNumber(data?.total_value, 0)

    useEffect(() => {
        setPercentages(buildInitialPercentages(data, value))
    }, [data, value])

    useEffect(() => {
        if (!onAnswer) return
        onAnswer(percentages)
    }, [onAnswer, percentages])

    function adjustSegment(targetId, delta) {
        if (disabled) return

        setPercentages((previous) => {
            const next = { ...previous }
            const current = toNumber(next[targetId], 0)
            const others = segmentIds.filter((id) => id !== targetId)

            if (others.length === 0) {
                next[targetId] = 100
                return next
            }

            if (delta > 0) {
                const maxIncrease = Math.min(delta, 100 - current)
                const available = others.reduce((sum, id) => sum + toNumber(next[id], 0), 0)
                let remaining = Math.min(maxIncrease, available)
                next[targetId] = current + remaining

                const reduceOrder = [...others].sort((a, b) => toNumber(next[b], 0) - toNumber(next[a], 0))
                for (const id of reduceOrder) {
                    if (remaining <= 0) break
                    const take = Math.min(toNumber(next[id], 0), remaining)
                    next[id] = toNumber(next[id], 0) - take
                    remaining -= take
                }
            } else if (delta < 0) {
                const maxDecrease = Math.min(Math.abs(delta), current)
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

            return normalizeToHundred(next, segmentIds)
        })
    }

    const chartData = segments.map((segment, index) => {
        const percentage = toNumber(percentages[segment.id], 0)
        return {
            ...segment,
            percentage,
            value: Math.round(totalValue * (percentage / 100)),
            fill: resolveColor(segment.color, ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0d9488'][index % 5]),
        }
    })

    return (
        <section className="interactive-widget interactive-widget--pie">
            <div className="interactive-pie-chart">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={48}
                            outerRadius={88}
                            stroke="#ffffff"
                            strokeWidth={2}
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.id} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(chartValue, _, payload) => {
                                const segment = payload?.payload
                                return [`${chartValue} (${segment?.percentage || 0}%)`, segment?.label || 'Segment']
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="interactive-legend">
                {chartData.map((segment) => (
                    <div className="interactive-legend__row" key={segment.id}>
                        <span className="interactive-legend__swatch" style={{ backgroundColor: segment.fill }} />
                        <span className="interactive-legend__label">{segment.label}</span>
                        <span className="interactive-legend__meta">{segment.percentage}%</span>
                        <span className="interactive-legend__meta">{segment.value}</span>
                        <div className="interactive-legend__actions">
                            <button
                                type="button"
                                className="interactive-step-btn"
                                onClick={() => adjustSegment(segment.id, -1)}
                                disabled={disabled}
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
            </div>
        </section>
    )
}
