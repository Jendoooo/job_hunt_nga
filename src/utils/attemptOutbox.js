const OUTBOX_KEY = 'jobhunt_attempt_outbox_v1'

function safeParse(raw) {
    try {
        const parsed = raw ? JSON.parse(raw) : null
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export function readAttemptOutbox() {
    if (typeof window === 'undefined') return []
    return safeParse(window.localStorage.getItem(OUTBOX_KEY))
}

export function writeAttemptOutbox(items) {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
    } catch {
        // Ignore storage quota errors.
    }
}

export function enqueueAttemptOutbox(payload) {
    if (!payload || typeof payload !== 'object') return
    if (!payload.id) return

    const existing = readAttemptOutbox()
    if (existing.some((item) => item?.id === payload.id)) return

    const next = [
        ...existing,
        {
            id: payload.id,
            queued_at: Date.now(),
            payload,
        },
    ]
    writeAttemptOutbox(next)
}

export function removeAttemptOutbox(id) {
    if (!id) return
    const existing = readAttemptOutbox()
    const next = existing.filter((item) => item?.id !== id)
    writeAttemptOutbox(next)
}

