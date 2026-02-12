import { DndContext, DragOverlay, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { GripVertical, X } from 'lucide-react'
import { useState } from 'react'

function resolvePillColor(color) {
    if (!color) return null
    const palette = {
        green: '#16a34a',
        red: '#dc2626',
        blue: '#2563eb',
        amber: '#d97706',
        slate: '#475569',
    }

    if (color.startsWith('#')) return color
    return palette[color.toLowerCase()] || null
}

function toTransformString(transform) {
    if (!transform) return undefined
    return `translate3d(${transform.x}px, ${transform.y}px, 0)`
}

function DraggablePill({ item, disabled = false }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `drag-pill-${item.id}`,
        data: { pillId: item.id },
        disabled,
    })

    return (
        <button
            type="button"
            ref={setNodeRef}
            className={`interactive-pill ${isDragging ? 'interactive-pill--dragging' : ''}`}
            style={{
                transform: toTransformString(transform),
                ...(resolvePillColor(item.color)
                    ? {
                        borderColor: resolvePillColor(item.color),
                        backgroundColor: `${resolvePillColor(item.color)}14`,
                        color: resolvePillColor(item.color),
                    }
                    : {}),
            }}
            {...listeners}
            {...attributes}
            disabled={disabled}
        >
            <GripVertical size={14} />
            {item.label}
        </button>
    )
}

function DropTarget({ rowId, assignedLabel, onClear }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `drag-row-${rowId}`,
        data: { rowId },
    })

    return (
        <div
            ref={setNodeRef}
            className={`interactive-dropzone ${isOver ? 'interactive-dropzone--over' : ''}`}
        >
            {assignedLabel ? (
                <div className="interactive-dropzone__value">
                    <span>{assignedLabel}</span>
                    <button type="button" onClick={() => onClear(rowId)} aria-label="Clear classification">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <span className="interactive-dropzone__placeholder">Drop label</span>
            )}
        </div>
    )
}

export default function SHLDragTableWidget({ data, value, onAnswer, disabled = false }) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
    const assignments = value && typeof value === 'object' ? value : {}
    const draggables = Array.isArray(data?.draggables) ? data.draggables : []
    const rows = Array.isArray(data?.rows) ? data.rows : []
    const columns = Array.isArray(data?.columns) ? data.columns : []
    const [activePillId, setActivePillId] = useState(null)

    const pillLookup = draggables.reduce((accumulator, item) => {
        accumulator[item.id] = item.label
        return accumulator
    }, {})

    function updateAnswer(nextAssignments) {
        if (!onAnswer) return
        onAnswer(nextAssignments)
    }

    function handleDragStart(event) {
        setActivePillId(event?.active?.data?.current?.pillId || null)
    }

    function handleDragEnd(event) {
        const pillId = event?.active?.data?.current?.pillId
        const rowId = event?.over?.data?.current?.rowId
        setActivePillId(null)

        if (!pillId || !rowId) return
        updateAnswer({
            ...assignments,
            [rowId]: pillId,
        })
    }

    function handleDragCancel() {
        setActivePillId(null)
    }

    function clearAssignment(rowId) {
        const next = { ...assignments }
        delete next[rowId]
        updateAnswer(next)
    }

    return (
        <section className="interactive-widget interactive-widget--table">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="interactive-table-wrap">
                    <table className="interactive-table">
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th key={column}>{column}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    {(row.values || []).map((cell, cellIndex) => (
                                        <td key={`${row.id}-${cellIndex}`}>{cell}</td>
                                    ))}
                                    <td>
                                        <DropTarget
                                            rowId={row.id}
                                            assignedLabel={pillLookup[assignments[row.id]]}
                                            onClear={clearAssignment}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="interactive-bank">
                    {draggables.map((item) => (
                        <DraggablePill key={item.id} item={item} disabled={disabled} />
                    ))}
                </div>

                <DragOverlay>
                    {activePillId ? (
                        <div className="interactive-pill interactive-pill--overlay">
                            <GripVertical size={14} />
                            {pillLookup[activePillId]}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </section>
    )
}
