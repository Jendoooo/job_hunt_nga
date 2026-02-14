import { useState } from 'react'

// SHL Verify Interactive: click-tab + click-answer pattern
// Each person/store tab shows that sub-question's data; click a lime-green button to answer.
// UNIQUE MODE (ranking): auto-detected when there are N numeric rank buttons for N rows.
//   In unique mode badges move, not clone — clicking a badge already assigned elsewhere
//   clears it from the old row and assigns it here.
export default function SHLDragTableWidget({ data, value, onAnswer, disabled = false }) {
  const assignments = value && typeof value === 'object' ? value : {}
  const draggables = Array.isArray(data?.draggables) ? data.draggables : []
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const columns = Array.isArray(data?.columns) ? data.columns : []

  function isNumericRank(value) {
    return /^\d+$/.test(String(value || '').trim())
  }

  // Unique mode: each rank can only be used once (ranking questions).
  // Heuristic: N rows + N numeric buttons (1..N). Keeps penalty/store questions in non-unique mode.
  const uniqueMode = rows.length > 1 &&
    draggables.length === rows.length &&
    draggables.every((d) => isNumericRank(d.label ?? d.id))

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [draggingId, setDraggingId] = useState(null)
  const [isOverAnswerCell, setIsOverAnswerCell] = useState(false)
  const activeRow = rows[Math.min(selectedIdx, rows.length - 1)] || rows[0]

  const pillLookup = draggables.reduce((acc, item) => {
    acc[item.id] = item.label
    return acc
  }, {})

  function handleDragStart(event, draggableId) {
    if (disabled) return
    setDraggingId(draggableId)

    try {
      event.dataTransfer.setData('text/plain', String(draggableId))
      event.dataTransfer.effectAllowed = 'move'
    } catch {
      // Dragging is optional; ignore dataTransfer failures.
    }
  }

  function handleDragEnd() {
    setDraggingId(null)
    setIsOverAnswerCell(false)
  }

  function handleAnswer(draggableId) {
    if (!onAnswer || !activeRow) return
    let next = { ...assignments, [activeRow.id]: draggableId }

    if (uniqueMode) {
      // Move: clear the same draggableId from any other row
      for (const [rowId, assignedId] of Object.entries(next)) {
        if (rowId !== activeRow.id && assignedId === draggableId) {
          delete next[rowId]
        }
      }
    }

    onAnswer(next)

    // Auto-advance to the next unanswered tab
    const nextUnanswered = rows.findIndex((r, i) => i !== selectedIdx && !next[r.id])
    if (nextUnanswered !== -1) setSelectedIdx(nextUnanswered)
  }

  if (!activeRow) return null

  // Last column = answer slot; all others = data columns
  const dataCols = columns.length > 1 ? columns.slice(0, -1) : columns
  const answerCol = columns.length > 1 ? columns[columns.length - 1] : 'Result'
  const assignedId = assignments[activeRow.id]
  const assignedLabel = assignedId ? (pillLookup[assignedId] ?? assignedId) : null

  // For unique mode: track which draggables are already used by OTHER rows
  const usedByRow = {} // draggableId → label of the row that uses it
  if (uniqueMode) {
    for (const row of rows) {
      if (row.id === activeRow.id) continue
      const a = assignments[row.id]
      if (a) usedByRow[a] = row.label || row.id
    }
  }

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
              <td
                className={[
                  'shl-dt__answer-cell',
                  draggingId ? 'shl-dt__answer-cell--droppable' : '',
                  isOverAnswerCell ? 'shl-dt__answer-cell--over' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragEnter={() => draggingId && setIsOverAnswerCell(true)}
                onDragLeave={() => setIsOverAnswerCell(false)}
                onDragOver={(event) => {
                  if (disabled) return
                  if (!draggingId) return
                  event.preventDefault()
                  try {
                    event.dataTransfer.dropEffect = 'move'
                  } catch {
                    // Ignore.
                  }
                }}
                onDrop={(event) => {
                  if (disabled) return
                  event.preventDefault()
                  const droppedId = (() => {
                    try {
                      return event.dataTransfer.getData('text/plain')
                    } catch {
                      return null
                    }
                  })()

                  const id = droppedId || draggingId
                  if (!id) return

                  setDraggingId(null)
                  setIsOverAnswerCell(false)
                  handleAnswer(id)
                }}
              >
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
        {draggables.map((d) => {
          const usedBy = uniqueMode ? usedByRow[d.id] : null
          return (
            <button
              key={d.id}
              type="button"
              className={[
                'shl-dt__answer-btn',
                !disabled ? 'shl-dt__answer-btn--draggable' : '',
                draggingId === d.id ? 'shl-dt__answer-btn--dragging' : '',
                usedBy ? 'shl-dt__answer-btn--used' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleAnswer(d.id)}
              disabled={disabled}
              draggable={!disabled}
              onDragStart={(event) => handleDragStart(event, d.id)}
              onDragEnd={handleDragEnd}
              title={usedBy ? `Currently assigned to ${usedBy}` : undefined}
            >
              {d.label}
              {usedBy && <span className="shl-dt__btn-used-by"> ↩ {usedBy}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
