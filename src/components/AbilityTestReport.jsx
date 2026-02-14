import { useMemo } from 'react'

function scoreToLetter(scorePct) {
    const score = Number(scorePct)
    if (!Number.isFinite(score)) return 'E'
    if (score >= 90) return 'A'
    if (score >= 75) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'E'
}

function buildNarrative(letterGrade, scorePct, moduleName) {
    const label = String(moduleName || 'this assessment')
    const score = Number(scorePct)
    const scoreLabel = Number.isFinite(score) ? `${score}%` : '--'

    if (letterGrade === 'A') {
        return `Your performance on ${label} is strong compared with typical expectations (${scoreLabel}). You are likely comfortable interpreting numerical information under time pressure.`
    }

    if (letterGrade === 'B') {
        return `Your performance on ${label} is above average (${scoreLabel}). With a bit more speed practice, you should be able to push into the top band consistently.`
    }

    if (letterGrade === 'C') {
        return `Your performance on ${label} is around the middle band (${scoreLabel}). You can solve many items correctly, but accuracy can drop when the pace increases.`
    }

    if (letterGrade === 'D') {
        return `Your performance on ${label} is below average (${scoreLabel}). Focus on building a repeatable method for reading charts quickly and checking calculations before committing.`
    }

    return `Your performance on ${label} suggests this is an area to improve (${scoreLabel}). Start by slowing down enough to avoid avoidable mistakes, then build speed with timed repetition.`
}

function buildNumericalTips(letterGrade) {
    const base = [
        'Write down key numbers and relationships first (totals, differences, ratios, percent changes).',
        'Convert statements into equations before touching the chart controls.',
        'Practice fast percentage conversions (e.g., 1/3, 2/5, 15% of 200, 20% increase).',
        'Use estimation as a sanity check before finalizing the exact value.',
        'Re-check what the question is asking (total, split %, rank order) before moving on.',
    ]

    if (letterGrade === 'A' || letterGrade === 'B') {
        return [
            'Keep the same working style, but tighten your final checks to prevent small slips.',
            'Practice harder multi-step items (mixed totals + split + ranking) on a timer.',
            ...base.slice(2),
        ]
    }

    return base
}

function GradeScale({ letterGrade }) {
    const letters = ['E', 'D', 'C', 'B', 'A']
    const activeIndex = letters.indexOf(letterGrade)
    const filledTo = activeIndex >= 0 ? activeIndex : 0

    return (
        <div className="ability-report__grade-scale" aria-label="Grade scale">
            <div className="ability-report__grade-bar" role="img" aria-label={`Grade ${letterGrade}`}>
                {letters.map((letter, index) => (
                    <div
                        key={letter}
                        className={`ability-report__grade-seg ${index <= filledTo ? 'ability-report__grade-seg--filled' : ''}`}
                    >
                        <span>{letter}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function formatSeconds(seconds) {
    const value = Number(seconds)
    if (!Number.isFinite(value) || value < 0) return '--'
    const mins = Math.floor(value / 60)
    const secs = Math.floor(value % 60)
    return `${mins}m ${secs}s`
}

export default function AbilityTestReport({
    moduleName,
    assessmentLabel = 'Numerical Reasoning',
    scorePct,
    correctCount,
    totalQuestions,
    timeTakenSeconds,
    timeAllowedSeconds,
}) {
    const letterGrade = useMemo(() => scoreToLetter(scorePct), [scorePct])
    const narrative = useMemo(() => buildNarrative(letterGrade, scorePct, assessmentLabel), [assessmentLabel, letterGrade, scorePct])
    const tips = useMemo(() => buildNumericalTips(letterGrade), [letterGrade])

    const scoreLabel = Number.isFinite(Number(scorePct)) ? `${Math.round(Number(scorePct))}%` : '--'
    const totalLabel = Number.isFinite(Number(totalQuestions)) ? totalQuestions : '--'
    const correctLabel = Number.isFinite(Number(correctCount)) ? correctCount : '--'

    return (
        <article className="ability-report" aria-label="Ability test report">
            <div className="ability-report__page">
                <header className="ability-report__mast">
                    <div className="ability-report__mast-title">Verify Candidate Ability Test Report</div>
                    <div className="ability-report__mast-sub">{moduleName || assessmentLabel}</div>
                </header>

                <section className="ability-report__section">
                    <h3 className="ability-report__h3">Introduction</h3>
                    <div className="ability-report__body">
                        <p>
                            This report summarises your performance on the ability tests you completed. These tests focus on how
                            quickly and accurately you can interpret numerical information and apply rules under time pressure.
                        </p>
                        <p className="ability-report__muted">
                            Use this report to guide practice. The best gains usually come from repeated timed sets and strict review
                            of the exact step where errors happen (reading the prompt, setting up the math, or entering the final value).
                        </p>
                    </div>
                </section>

                <section className="ability-report__section">
                    <h3 className="ability-report__h3">The Ability Tests</h3>
                    <div className="ability-report__body">
                        <p>
                            The session you completed included interactive chart tasks (stacked bars, pie charts, ranking, and line graphs).
                            Each question is designed to measure speed and accuracy when working with numerical data.
                        </p>
                    </div>
                </section>

                <section className="ability-report__section">
                    <h3 className="ability-report__h3">Results</h3>

                    <div className="ability-report__results-card">
                        <div className="ability-report__results-head">
                            <div className="ability-report__results-label">{assessmentLabel}</div>
                            <div className="ability-report__results-grade">Grade <strong>{letterGrade}</strong></div>
                        </div>

                        <GradeScale letterGrade={letterGrade} />

                        <div className="ability-report__results-meta">
                            <div>
                                <div className="ability-report__meta-k">Score</div>
                                <div className="ability-report__meta-v">{scoreLabel}</div>
                            </div>
                            <div>
                                <div className="ability-report__meta-k">Correct</div>
                                <div className="ability-report__meta-v">{correctLabel}/{totalLabel}</div>
                            </div>
                            <div>
                                <div className="ability-report__meta-k">Time Taken</div>
                                <div className="ability-report__meta-v">{formatSeconds(timeTakenSeconds)}</div>
                            </div>
                            <div>
                                <div className="ability-report__meta-k">Time Allowed</div>
                                <div className="ability-report__meta-v">{formatSeconds(timeAllowedSeconds)}</div>
                            </div>
                        </div>

                        <p className="ability-report__results-narrative">{narrative}</p>
                    </div>

                    <div className="ability-report__tips-card">
                        <h4 className="ability-report__h4">Ideas to help improve your skills</h4>
                        <ul className="ability-report__tips">
                            {tips.map((tip) => (
                                <li key={tip}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="ability-report__section">
                    <h3 className="ability-report__h3">Assessment Methodology</h3>
                    <div className="ability-report__body">
                        <table className="ability-report__table" aria-label="Assessment methodology">
                            <thead>
                                <tr>
                                    <th>Assessment</th>
                                    <th>Comparison Group</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{assessmentLabel}</td>
                                    <td>Practice comparison group (local)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </article>
    )
}
