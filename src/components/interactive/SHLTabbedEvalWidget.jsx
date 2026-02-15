import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'

function toDisplayCost(value) {
    if (value === null || value === undefined || value === '') return '--'
    if (typeof value === 'number' && Number.isFinite(value)) return `$${value.toFixed(2)}`

    const numeric = Number(String(value).replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(numeric)) return `$${numeric.toFixed(2)}`

    return String(value)
}

function normalizeAnswerMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return { ...value }
}

export default function SHLTabbedEvalWidget({ data, value, onAnswer, disabled = false }) {
    const tabs = useMemo(
        () => (Array.isArray(data?.tabs) ? data.tabs : []),
        [data?.tabs]
    )
    const options = useMemo(() => (
        Array.isArray(data?.options) && data.options.length > 0
            ? data.options
            : [
                { id: 'approved', label: 'Approved' },
                { id: 'not_approved', label: 'Not Approved' },
            ]
    ), [data?.options])
    const columns = useMemo(() => {
        if (Array.isArray(data?.columns) && data.columns.length > 0) return data.columns
        return [
            { key: 'item', label: 'Meal' },
            { key: 'count', label: '# of People' },
            { key: 'cost', label: 'Cost' },
        ]
    }, [data?.columns])
    const approvalLabel = data?.approval_label || 'Approval Status'

    const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || null)
    const [answers, setAnswers] = useState(() => normalizeAnswerMap(value))

    useEffect(() => {
        setAnswers(normalizeAnswerMap(value))
    }, [value])

    useEffect(() => {
        if (tabs.length === 0) {
            setActiveTabId(null)
            return
        }

        const hasActiveTab = tabs.some((tab) => tab.id === activeTabId)
        if (!hasActiveTab) {
            setActiveTabId(tabs[0].id)
        }
    }, [activeTabId, tabs])

    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) || null,
        [activeTabId, tabs]
    )
    const currentAnswer = activeTabId ? answers[activeTabId] : null

    function handleSelect(optionId) {
        if (disabled || !activeTabId) return
        const next = { ...answers, [activeTabId]: optionId }
        setAnswers(next)
        if (onAnswer) onAnswer(next)
    }

    return (
        <section className="interactive-widget interactive-widget--tabbed">
            <div className="tabeval-tabs">
                {tabs.map((tab) => {
                    const isActive = activeTabId === tab.id
                    const isDone = answers[tab.id] != null
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            className={`tabeval-tab ${isActive ? 'tabeval-tab--active' : ''}`}
                            onClick={() => setActiveTabId(tab.id)}
                            disabled={disabled}
                        >
                            {tab.label}
                            {isDone && !isActive && (
                                <span className="tabeval-tab__check">OK</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {activeTab && (
                <div className="tabeval-table-wrap">
                    <table className="tabeval-table">
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(Array.isArray(activeTab.rows) ? activeTab.rows : []).map((row, index) => (
                                <tr key={`${activeTab.id}-${index}`} className={row.item === 'Total' ? 'tabeval-row--total' : ''}>
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {col.key === 'cost' ? toDisplayCost(row[col.key]) : (row[col.key] ?? '--')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="tabeval-approval-section">
                <div className="tabeval-approval__label">{approvalLabel}</div>
                <div className="tabeval-approval__btns">
                    {options.map((option) => {
                        const isSelected = currentAnswer === option.id
                        let className = 'tabeval-btn'
                        if (isSelected) {
                            className += option.id === 'approved' || option.id === 'none'
                                ? ' tabeval-btn--approved'
                                : option.id === 'not_approved'
                                    ? ' tabeval-btn--not-approved'
                                    : ' tabeval-btn--approved'
                        }

                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={className}
                                onClick={() => handleSelect(option.id)}
                                disabled={disabled || !activeTabId}
                            >
                                {isSelected && <Check size={14} style={{ marginRight: 4 }} />}
                                {option.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
