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

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            setProfile(data)
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let mounted = true

        // Safety timeout: stop loading after 5s no matter what
        const timer = setTimeout(() => {
            if (mounted) {
                console.warn('Auth check timed out, forcing load completion')
                setLoading(false)
            }
        }, 5000)

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setLoading(false)
            }
        }).catch(error => {
            console.error('Error getting session:', error)
            if (mounted) setLoading(false)
        }).finally(() => {
            clearTimeout(timer)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return
                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                    setLoading(false)
                }
            }
        )

        return () => {
            mounted = false
            clearTimeout(timer)
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
        // Prefer global sign-out, but gracefully fallback to local session clear
        // if network conditions block token revocation.
        let signOutError = null

        try {
            const { error } = await withTimeout(
                supabase.auth.signOut({ scope: 'global' }),
                5000,
                'Global sign-out timed out.'
            )
            signOutError = error
        } catch (error) {
            signOutError = error
        }

        if (signOutError) {
            console.warn('Global sign-out failed, falling back to local sign-out:', signOutError)
            const { error: localError } = await withTimeout(
                supabase.auth.signOut({ scope: 'local' }),
                5000,
                'Local sign-out timed out.'
            )
            if (localError) throw localError
        }

        setUser(null)
        setProfile(null)
        setLoading(false)
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
