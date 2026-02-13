import { useState } from 'react'

// SHL Verify Interactive: click-tab + click-answer pattern
// User selects a person/store tab → data updates → clicks a lime-green answer button
export default function SHLDragTableWidget({ data, value, onAnswer, disabled = false }) {
  const assignments = value && typeof value === 'object' ? value : {}
  const draggables = Array.isArray(data?.draggables) ? data.draggables : []
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const columns = Array.isArray(data?.columns) ? data.columns : []

  const [selectedIdx, setSelectedIdx] = useState(0)

  const activeRow = rows[Math.min(selectedIdx, rows.length - 1)] || rows[0]

  const pillLookup = draggables.reduce((acc, item) => {
    acc[item.id] = item.label
    return acc
  }, {})

  function handleAnswer(draggableId) {
    if (!onAnswer || !activeRow) return
    const next = { ...assignments, [activeRow.id]: draggableId }
    onAnswer(next)
    // Auto-advance to next unanswered tab
    const nextUnanswered = rows.findIndex((r, i) => i !== selectedIdx && !next[r.id])
    if (nextUnanswered !== -1) setSelectedIdx(nextUnanswered)
  }

  if (!activeRow) return null

  // Last column = answer slot; all others = data columns
  const dataCols = columns.length > 1 ? columns.slice(0, -1) : columns
  const answerCol = columns.length > 1 ? columns[columns.length - 1] : 'Result'
  const assignedId = assignments[activeRow.id]
  const assignedLabel = assignedId ? (pillLookup[assignedId] ?? assignedId) : null

  return (
    <section className="shl-dt">
      <div className="shl-dt__table-wrap">
        <table className="shl-dt__table">
          <thead>
            <tr>
              {dataCols.map((col) => (
                <th key={col}>{col}</th>
              ))}
              <th className="shl-dt__answer-th">{answerCol}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {dataCols.map((col, i) => (
                <td key={col}>{(activeRow.values || [])[i] ?? ''}</td>
              ))}
              <td className="shl-dt__answer-cell">
                {assignedLabel ? (
                  assignedLabel
                ) : (
                  <span className="shl-dt__answer-placeholder">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {rows.length > 1 && (
        <div className="shl-dt__tabs">
          {rows.map((row, i) => {
            const isAnswered = !!assignments[row.id]
            const isActive = i === selectedIdx
            return (
              <button
                key={row.id}
                type="button"
                className={[
                  'shl-dt__tab',
                  isActive ? 'shl-dt__tab--active' : '',
                  isAnswered && !isActive ? 'shl-dt__tab--answered' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedIdx(i)}
              >
                {row.label || `Tab ${i + 1}`}
              </button>
            )
          })}
        </div>
      )}

      <div className="shl-dt__answers">
        {draggables.map((d) => (
          <button
            key={d.id}
            type="button"
            className="shl-dt__answer-btn"
            onClick={() => handleAnswer(d.id)}
            disabled={disabled}
          >
            {d.label}
          </button>
        ))}
      </div>
    </section>
  )
}
