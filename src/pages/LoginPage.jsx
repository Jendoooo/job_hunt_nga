import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, CheckCircle2, Loader2, Target } from 'lucide-react'

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                await signIn(email, password)
                navigate('/')
            } else {
                await signUp(email, password, fullName)
                setError('Account created! Confirm your email, then sign in.')
                setIsLogin(true)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <aside className="auth-page__brand">
                <div className="auth-page__brand-bg"></div>
                <div className="auth-page__brand-content">
                    <div className="auth-logo">
                        <Target size={24} />
                        <span>JobHunt Nigeria</span>
                    </div>
                    <h1>Assessment practice designed for real hiring pressure.</h1>
                    <p>
                        Train with employer-aligned modules, timed flows, and detailed post-test feedback built for graduate recruitment.
                    </p>
                    <ul>
                        <li><CheckCircle2 size={16} /> TotalEnergies technical + aptitude tracks</li>
                        <li><CheckCircle2 size={16} /> NLNG SHL deductive preparation</li>
                        <li><CheckCircle2 size={16} /> AI-assisted explanations and custom quizzes</li>
                    </ul>
                </div>
            </aside>

            <main className="auth-page__panel">
                <Motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="auth-card"
                >
                    <header className="auth-card__header">
                        <p className="auth-card__eyebrow">Secure Access</p>
                        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                        <p>{isLogin ? 'Sign in to continue your preparation.' : 'Create your account to begin practice.'}</p>
                    </header>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <Motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="form-group"
                                >
                                    <label htmlFor="fullName">Full Name</label>
                                    <div className="form-group-icon">
                                        <User size={18} />
                                        <input
                                            id="fullName"
                                            className="form-input"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="e.g. Olajide Ayeola"
                                            required={!isLogin}
                                        />
                                    </div>
                                </Motion.div>
                            )}
                        </AnimatePresence>

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="form-group-icon">
                                <Mail size={18} />
                                <input
                                    id="email"
                                    className="form-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="form-group-icon">
                                <Lock size={18} />
                                <input
                                    id="password"
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className={`auth-form__message ${error.includes('created') ? 'auth-form__message--success' : 'auth-form__message--error'}`}>
                                {error}
                            </div>
                        )}

                        <button className="btn btn--primary btn--lg btn--full" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <footer className="auth-card__footer">
                        <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
                        <button
                            type="button"
                            className="auth-card__toggle"
                            onClick={() => {
                                setIsLogin(!isLogin)
                                setError('')
                            }}
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </footer>
                </Motion.section>
            </main>
        </div>
    )
}
