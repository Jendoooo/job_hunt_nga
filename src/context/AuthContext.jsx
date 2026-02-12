import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs)
        }),
    ])
}

function isAbortLikeError(error) {
    const message = typeof error?.message === 'string'
        ? error.message.toLowerCase()
        : ''
    return error?.name === 'AbortError' || message.includes('aborted')
}

function isSessionBootstrapTimeout(error) {
    return String(error?.message || '').includes('Timed out while retrieving auth session.')
}

function clearSupabaseAuthStorage() {
    if (typeof window === 'undefined') return

    const clearTokenKeys = (storage) => {
        try {
            const keys = []
            for (let index = 0; index < storage.length; index += 1) {
                const key = storage.key(index)
                if (!key) continue
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    keys.push(key)
                }
            }

            keys.forEach((key) => storage.removeItem(key))
        } catch {
            // Ignore storage cleanup issues.
        }
    }

    clearTokenKeys(window.localStorage)
    clearTokenKeys(window.sessionStorage)
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async (userId, signal) => {
        try {
            let query = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            if (signal) {
                query = query.abortSignal(signal)
            }

            const { data, error } = await query

            if (error) throw error
            if (signal?.aborted) return null

            setProfile(data || null)
            return data || null
        } catch (error) {
            if (isAbortLikeError(error) || signal?.aborted) {
                return null
            }
            console.error('Error fetching profile:', error)
            return null
        } finally {
            if (!signal?.aborted) {
                setLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        let active = true
        const controller = new AbortController()

        async function initializeSession() {
            try {
                const { data, error } = await withTimeout(
                    supabase.auth.getSession(),
                    8000,
                    'Timed out while retrieving auth session.'
                )
                if (!active) return
                if (error) throw error

                const session = data?.session ?? null
                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id, controller.signal)
                } else {
                    setProfile(null)
                    setLoading(false)
                }
            } catch (error) {
                if (!isAbortLikeError(error) && !isSessionBootstrapTimeout(error)) {
                    console.error('Error getting session:', error)
                }
                if (active) {
                    setUser(null)
                    setProfile(null)
                    setLoading(false)
                }
            }
        }

        initializeSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!active) return
                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id, controller.signal)
                } else {
                    setProfile(null)
                    setLoading(false)
                }
            }
        )

        return () => {
            active = false
            controller.abort()
            subscription.unsubscribe()
        }
    }, [fetchProfile])

    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    }

    async function signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        })
        if (error) throw error
        return data
    }

    async function signOut() {
        let localError = null
        try {
            const { error } = await withTimeout(
                supabase.auth.signOut({ scope: 'local' }),
                5000,
                'Local sign-out timed out.'
            )
            if (error) {
                localError = error
            }
        } catch (error) {
            localError = error
        }

        if (localError) {
            console.warn('Local sign-out failed; forcing client cleanup:', localError)
            clearSupabaseAuthStorage()
        }

        // Always clear in-memory auth state so the UI never stays "stuck signed in".
        setUser(null)
        setProfile(null)
        setLoading(false)

        // Best-effort global revoke in background; do not block local logout UX.
        void withTimeout(
            supabase.auth.signOut({ scope: 'global' }),
            5000,
            'Global sign-out timed out.'
        ).catch((error) => {
            console.warn('Global sign-out revoke failed (non-blocking):', error)
        })
    }

    const value = {
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
