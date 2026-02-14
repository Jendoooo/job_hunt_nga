import { supabase, hasSupabaseEnv } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function getProjectRef(url) {
    const match = String(url || '').match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i)
    return match?.[1] || null
}

function readAccessTokenFromStorage() {
    if (typeof window === 'undefined') return null
    const projectRef = getProjectRef(SUPABASE_URL)
    if (!projectRef) return null

    const key = `sb-${projectRef}-auth-token`
    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed?.access_token || null
    } catch {
        return null
    }
}

async function getAccessToken() {
    // Avoid hanging on auth refresh in some browser/network setups:
    // Prefer the cached token from localStorage and only try getSession briefly.
    const stored = readAccessTokenFromStorage()
    if (stored) return stored

    const sessionPromise = supabase.auth.getSession()
    try {
        const { data, error } = await Promise.race([
            sessionPromise,
            new Promise((resolve) => setTimeout(() => resolve({ data: null, error: new Error('getSession timeout') }), 1200)),
        ])

        if (!error) {
            const token = data?.session?.access_token
            if (token) return token
        }
    } catch {
        // Ignore and fall back to localStorage.
    }

    return readAccessTokenFromStorage()
}

async function readPostgrestError(response) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        try {
            const body = await response.json()
            if (body && typeof body === 'object') {
                const message = body.message || body.error_description || body.error || null
                return { message, body }
            }
        } catch {
            // Fall through to text read.
        }
    }

    try {
        const text = await response.text()
        return { message: text || null, body: null }
    } catch {
        return { message: null, body: null }
    }
}

function attachAbortSignal(controller, externalSignal) {
    if (!externalSignal) return () => { }
    if (externalSignal.aborted) {
        controller.abort()
        return () => { }
    }

    const handler = () => controller.abort()
    externalSignal.addEventListener('abort', handler, { once: true })
    return () => externalSignal.removeEventListener('abort', handler)
}

export async function insertTestAttempt(payload, { signal, timeoutMs = 15000 } = {}) {
    if (!hasSupabaseEnv) {
        throw new Error('Supabase is not configured.')
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are missing.')
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
        throw new Error('Not authenticated.')
    }

    const controller = new AbortController()
    const detach = attachAbortSignal(controller, signal)
    const timerId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/test_attempts`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        })

        // Duplicate attempt IDs can happen during retries. Treat conflict as success.
        if (response.status === 409) {
            return { ok: true, duplicate: true }
        }

        if (!response.ok) {
            const { message } = await readPostgrestError(response)
            const suffix = message ? `: ${message}` : ''
            throw new Error(`Supabase insert failed (${response.status})${suffix}`)
        }

        return { ok: true, duplicate: false }
    } finally {
        clearTimeout(timerId)
        detach()
        controller.abort()
    }
}
