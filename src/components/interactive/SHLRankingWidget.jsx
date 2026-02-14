import { useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function toNumber(value, fallback = null) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function transformToStyle(transform) {
  if (!transform) return undefined
  const x = Math.round(transform.x || 0)
  const y = Math.round(transform.y || 0)
  const scaleX = transform.scaleX ?? 1
  const scaleY = transform.scaleY ?? 1
  return `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})`
}

function RankBadge({ rank, label, placed = false, disabled = false }) {
  const draggableId = `rank:${rank}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled,
    data: { rank },
  })

  const style = transform ? { transform: transformToStyle(transform) } : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        'shl-rank__badge',
        placed ? 'shl-rank__badge--placed' : 'shl-rank__badge--pool',
        isDragging ? 'shl-rank__badge--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      disabled={disabled}
      aria-label={label || `Rank ${rank}`}
      title={label || `Rank ${rank}`}
      {...attributes}
      {...listeners}
    >
      {rank}
    </button>
  )
}

function DroppableSlot({ id, isOver, children, disabled = false, label }) {
  const { setNodeRef } = useDroppable({
    id,
    disabled,
    data: { slotId: id },
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        'shl-rank__slot',
        isOver ? 'shl-rank__slot--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      {children}
    </div>
  )
}

function extractRankFromId(id) {
  if (typeof id !== 'string') return null
  if (!id.startsWith('rank:')) return null
  return toNumber(id.slice('rank:'.length), null)
}

export default function SHLRankingWidget({ data, value, onAnswer, disabled = false }) {
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data])
  const rankLabels = useMemo(() => (Array.isArray(data?.rank_labels) ? data.rank_labels : []), [data])
  const assignments = useMemo(() => (value && typeof value === 'object' ? value : {}), [value])

  const rankCount = useMemo(() => {
    const fromLabels = rankLabels.length
    const fromItems = items.length
    return clamp(Math.max(fromLabels, fromItems, 0), 0, 24)
  }, [items.length, rankLabels.length])

  const ranks = useMemo(() => Array.from({ length: rankCount }, (_, idx) => idx + 1), [rankCount])

  const rankLabelMap = useMemo(() => (
    ranks.reduce((acc, rank) => {
      acc[rank] = rankLabels[rank - 1] || String(rank)
      return acc
    }, {})
  ), [rankLabels, ranks])

  const rankToItem = useMemo(() => {
    const inverted = {}
    for (const [itemId, rankValue] of Object.entries(assignments || {})) {
      const numeric = toNumber(rankValue, null)
      if (!numeric) continue
      inverted[numeric] = itemId
    }
    return inverted
  }, [assignments])

  const unassignedRanks = useMemo(() => (
    ranks.filter((rank) => !rankToItem[rank])
  ), [rankToItem, ranks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  )

  const [activeRank, setActiveRank] = useState(null)
  const [overId, setOverId] = useState(null)

  function emit(next) {
    if (!onAnswer) return
    onAnswer(next)
  }

  function applyDrop(rank, destination) {
    const rankNum = toNumber(rank, null)
    if (!rankNum) return

    const sourceItemId = rankToItem[rankNum] || null
    const destItemId = destination?.startsWith('slot:')
      ? destination.slice('slot:'.length)
      : null

    // Dropped on pool => unassign
    if (destination === 'pool') {
      if (!sourceItemId) return
      const next = { ...assignments }
      delete next[sourceItemId]
      emit(next)
      return
    }

    if (!destItemId) return
    if (destItemId === sourceItemId) return

    const destOldRank = toNumber(assignments?.[destItemId], null)

    const next = { ...assignments }

    if (sourceItemId) delete next[sourceItemId]
    next[destItemId] = rankNum

    // Swap: if destination already had a rank, move it back to source item (if any).
    if (destOldRank && sourceItemId) {
      next[sourceItemId] = destOldRank
    }

    emit(next)
  }

  return (
    <section className="shl-rank" aria-label="Ranking task">
      <DndContext
        sensors={disabled ? undefined : sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          if (disabled) return
          const rank = extractRankFromId(event?.active?.id)
          setActiveRank(rank)
        }}
        onDragOver={(event) => {
          if (disabled) return
          setOverId(event?.over?.id ?? null)
        }}
        onDragCancel={() => {
          setActiveRank(null)
          setOverId(null)
        }}
        onDragEnd={(event) => {
          if (disabled) return
          const rank = extractRankFromId(event?.active?.id)
          const destination = event?.over?.id ?? null
          setActiveRank(null)
          setOverId(null)
          if (!rank || !destination) return
          applyDrop(rank, destination)
        }}
      >
        <div className="shl-rank__table-wrap">
          <table className="shl-rank__table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="shl-rank__rank-th">Rank</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const rank = toNumber(assignments?.[item.id], null)
                const slotId = `slot:${item.id}`
                const isOver = overId === slotId
                const label = rank ? rankLabelMap[rank] : null

                return (
                  <tr key={item.id}>
                    <td className="shl-rank__item-cell">{item.label || item.id}</td>
                    <td className="shl-rank__slot-cell">
                      <DroppableSlot
                        id={slotId}
                        isOver={Boolean(isOver)}
                        disabled={disabled}
                        label={`Rank slot for ${item.label || item.id}`}
                      >
                        {rank ? (
                          <RankBadge
                            rank={rank}
                            label={label}
                            placed
                            disabled={disabled}
                          />
                        ) : (
                          <span className="shl-rank__placeholder">—</span>
                        )}
                      </DroppableSlot>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="shl-rank__pool-wrap">
          <div className="shl-rank__pool-head">
            <div className="shl-rank__pool-title">Rank badges</div>
            {rankCount > 0 && (
              <div className="shl-rank__pool-hint">
                Drag a number onto a row. Drop back here to unassign.
              </div>
            )}
          </div>

          <Pool
            ranks={unassignedRanks}
            rankLabelMap={rankLabelMap}
            activeOver={overId === 'pool'}
            disabled={disabled}
          />
        </div>

        <DragOverlay>
          {activeRank ? (
            <div className="shl-rank__overlay">
              <div className="shl-rank__overlay-badge">{activeRank}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}

function Pool({ ranks, rankLabelMap, activeOver, disabled }) {
  const { setNodeRef } = useDroppable({
    id: 'pool',
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        'shl-rank__pool',
        activeOver ? 'shl-rank__pool--over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Rank badge pool"
    >
      {ranks.length > 0 ? (
        ranks.map((rank) => (
          <RankBadge
            key={rank}
            rank={rank}
            label={rankLabelMap[rank]}
            placed={false}
            disabled={disabled}
          />
        ))
      ) : (
        <div className="shl-rank__pool-empty">All ranks assigned.</div>
      )}
    </div>
  )
}
