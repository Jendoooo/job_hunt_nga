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
                                <th>Meal</th>
                                <th># of People</th>
                                <th>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(Array.isArray(activeTab.rows) ? activeTab.rows : []).map((row, index) => (
                                <tr key={`${activeTab.id}-${index}`} className={row.item === 'Total' ? 'tabeval-row--total' : ''}>
                                    <td>{row.item || ''}</td>
                                    <td>{row.count != null ? row.count : '--'}</td>
                                    <td>{toDisplayCost(row.cost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="tabeval-approval-section">
                <div className="tabeval-approval__label">Approval Status</div>
                <div className="tabeval-approval__btns">
                    {options.map((option) => {
                        const isSelected = currentAnswer === option.id
                        let className = 'tabeval-btn'
                        if (isSelected) {
                            className += option.id === 'approved'
                                ? ' tabeval-btn--approved'
                                : ' tabeval-btn--not-approved'
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
