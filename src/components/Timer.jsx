import { useState, useEffect, useRef } from 'react'

export default function Timer({ duration, onTimeUp, isPaused = false }) {
    const [timeLeft, setTimeLeft] = useState(duration)
    const intervalRef = useRef(null)

    useEffect(() => {
        setTimeLeft(duration)
    }, [duration])

    useEffect(() => {
        if (isPaused) {
            clearInterval(intervalRef.current)
            return
        }

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current)
                    onTimeUp && onTimeUp()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(intervalRef.current)
    }, [isPaused, onTimeUp])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const safeDuration = duration > 0 ? duration : 1
    const percentage = (timeLeft / safeDuration) * 100
    const isUrgent = timeLeft <= 60
    const isCritical = timeLeft <= 30

    return (
        <div
            className={`timer ${isUrgent ? 'timer--urgent' : ''} ${isCritical ? 'timer--critical' : ''}`}
            aria-live="polite"
        >
            <div className="timer__ring">
                <svg viewBox="0 0 100 100">
                    <circle
                        className="timer__ring-bg"
                        cx="50" cy="50" r="45"
                        fill="none"
                        strokeWidth="6"
                    />
                    <circle
                        className="timer__ring-progress"
                        cx="50" cy="50" r="45"
                        fill="none"
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            <div className="timer__display">
                <span className="timer__minutes">{String(minutes).padStart(2, '0')}</span>
                <span className="timer__separator">:</span>
                <span className="timer__seconds">{String(seconds).padStart(2, '0')}</span>
            </div>
            {isUrgent && <div className="timer__warning">Time running out!</div>}
        </div>
    )
}
