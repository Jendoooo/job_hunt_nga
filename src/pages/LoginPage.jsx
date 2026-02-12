import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
                setError('Account created! Check your email to confirm, then log in.')
                setIsLogin(true)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            {/* Left Side - Branding & Messaging */}
            <div className="login-page__brand-side">
                <div className="login-page__bg-pattern">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad)" opacity="0.1" />
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <div className="login-page__brand-content">
                    <div className="login-page__logo">
                        <Target size={32} strokeWidth={2.5} />
                        <span>JobHunt Nigeria</span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="login-page__headline">
                            Master Your Graduate Assessment.
                        </h1>
                        <p className="login-page__subheadline">
                            Practice with industry-standard aptitude tests, technical assessments, and AI-powered feedback designed for top-tier graduate programs.
                        </p>
                    </motion.div>
                </div>

                <div className="login-page__features">
                    <div className="login-page__feature">
                        <CheckCircle2 size={20} />
                        <span>TotalEnergies Technical Coverage</span>
                    </div>
                    <div className="login-page__feature">
                        <CheckCircle2 size={20} />
                        <span>Saville Swift Analysis Practice</span>
                    </div>
                    <div className="login-page__feature">
                        <CheckCircle2 size={20} />
                        <span>AI-Driven Explanations</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="login-page__form-side">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="login-card"
                >
                    <div className="login-card__header">
                        <h2 className="login-card__title">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="login-card__subtitle">
                            {isLogin ? 'Enter your credentials to access your dashboard.' : 'Start your journey to success today.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-card__form">
                        <AnimatePresence mode='wait'>
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="form-group"
                                >
                                    <label htmlFor="fullName">Full Name</label>
                                    <div className="form-group-icon">
                                        <User size={20} />
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
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="form-group-icon">
                                <Mail size={20} />
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
                                <Lock size={20} />
                                <input
                                    id="password"
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`login-card__message ${error.includes('created') ? 'login-card__message--success' : 'login-card__message--error'}`}
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            className="btn btn--primary btn--full btn--lg"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-card__footer">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            className="login-card__toggle"
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
