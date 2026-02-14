import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'

function isAbortLikeError(error) {
    const message = typeof error?.message === 'string'
        ? error.message.toLowerCase()
        : ''
    return error?.name === 'AbortError' || message.includes('aborted')
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

function hasStoredSession() {
    if (typeof window === 'undefined') return false
    try {
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i)
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const raw = window.localStorage.getItem(key)
                return Boolean(raw && raw.length > 10)
            }
        }
    } catch {
        // Storage access failed — assume no session.
    }
    return false
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    // Only show the loading spinner if there IS a stored session to validate.
    // Unauthenticated visitors see the login page immediately — no spinner.
    const [loading, setLoading] = useState(hasStoredSession)
    const initializedRef = useRef(false)

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
        }
    }, [])

    useEffect(() => {
        let active = true
        const controller = new AbortController()
        initializedRef.current = false

        // ------------------------------------------------------------------
        // onAuthStateChange is the SINGLE source of truth for auth state.
        //
        // In Supabase JS v2.39+, it fires INITIAL_SESSION automatically when
        // the listener is set up.  We also call getSession() afterwards as a
        // belt-and-suspenders trigger — but its return value is NOT used for
        // state; onAuthStateChange handles that.
        //
        // Previous code wrapped getSession() in an 8-second timeout that
        // forcefully set user = null on slow networks, causing logout on
        // every page refresh when Supabase needed a moment to refresh the
        // JWT access token.
        // ------------------------------------------------------------------

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!active) return

                const sessionUser = session?.user ?? null
                setUser(sessionUser)

                if (sessionUser) {
                    // Fetch profile in a microtask so Supabase internal locks
                    // (if any) are released before we issue another query.
                    await fetchProfile(sessionUser.id, controller.signal)
                } else {
                    setProfile(null)
                }

                // Mark loading done after the first auth event resolves.
                if (!initializedRef.current) {
                    initializedRef.current = true
                    if (active) setLoading(false)
                }
            }
        )

        // Kick off getSession() so Supabase refreshes the access token if
        // needed.  The result flows through onAuthStateChange above.
        supabase.auth.getSession().then(({ data, error }) => {
            if (!active) return
            if (error) {
                console.error('getSession error (non-fatal):', error)
            }

            // Fallback: if onAuthStateChange hasn't fired yet (shouldn't
            // happen in v2.39+ but guard defensively), bootstrap from the
            // getSession return value.
            if (!initializedRef.current) {
                initializedRef.current = true
                const session = data?.session ?? null
                setUser(session?.user ?? null)

                if (session?.user) {
                    fetchProfile(session.user.id, controller.signal).finally(() => {
                        if (active) setLoading(false)
                    })
                } else {
                    setProfile(null)
                    if (active) setLoading(false)
                }
            }
        })

        // Safety net: if nothing resolves within 12 seconds, stop the
        // loading spinner so the app doesn't hang forever.
        const safetyTimer = setTimeout(() => {
            if (active && !initializedRef.current) {
                initializedRef.current = true
                setLoading(false)
            }
        }, 12000)

        return () => {
            active = false
            controller.abort()
            subscription.unsubscribe()
            clearTimeout(safetyTimer)
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
                data: { full_name: fullName },
                emailRedirectTo: window.location.origin,
            }
        })
        if (error) throw error
        return data
    }

    async function signOut() {
        let localError = null
        try {
            const { error } = await Promise.race([
                supabase.auth.signOut({ scope: 'local' }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Local sign-out timed out.')), 5000)
                ),
            ])
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
        void Promise.race([
            supabase.auth.signOut({ scope: 'global' }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Global sign-out timed out.')), 5000)
            ),
        ]).catch((error) => {
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
