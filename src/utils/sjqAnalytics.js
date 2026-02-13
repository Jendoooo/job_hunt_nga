export const SJQ_COMPETENCIES = [
    {
        id: 'safety',
        label: 'Safety',
        tip: 'Prioritize risk control: stop unsafe work, follow critical controls, and escalate hazards immediately.',
    },
    {
        id: 'integrity',
        label: 'Integrity',
        tip: 'Be transparent under pressure: avoid conflicts of interest, handle data ethically, and report issues early.',
    },
    {
        id: 'quality',
        label: 'Quality',
        tip: 'Protect standards: follow checks/SOPs and fix errors before release even when deadlines are tight.',
    },
    {
        id: 'people',
        label: 'People',
        tip: 'Communicate respectfully: listen, clarify, and address issues directly without blame or public confrontation.',
    },
    {
        id: 'innovation',
        label: 'Innovation',
        tip: 'Improve with evidence: propose small pilots, measure impact, and get buy-in before scaling changes.',
    },
    {
        id: 'delivery',
        label: 'Delivery',
        tip: 'Manage priorities early: negotiate scope/timeline, surface blockers, and confirm alignment with stakeholders.',
    },
]

export const SJQ_RESPONSE_MAX_UNITS = 3

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

export function normalizeSJQCompetencyId(value) {
    const key = String(value || '').trim().toLowerCase()
    if (!key) return 'delivery'
    const match = SJQ_COMPETENCIES.find((item) => item.id === key)
    return match ? match.id : 'delivery'
}

export function resolveSJQCompetencyMeta(id) {
    const key = normalizeSJQCompetencyId(id)
    return SJQ_COMPETENCIES.find((item) => item.id === key) || SJQ_COMPETENCIES[SJQ_COMPETENCIES.length - 1]
}

export function resolveSJQRatingLabel(value) {
    const rating = Number(value)
    if (rating === 1) return 'Less Effective'
    if (rating === 2) return 'Less Effective'
    if (rating === 3) return 'More Effective'
    if (rating === 4) return 'More Effective'
    return '--'
}

export function scoreSJQResponseUnits(expectedRating, actualRating) {
    const expected = Number(expectedRating)
    const actual = Number(actualRating)
    if (!Number.isFinite(expected) || !Number.isFinite(actual)) return 0

    const diff = Math.abs(actual - expected)
    if (!Number.isFinite(diff)) return 0

    // 4-point scale => max distance is 3.
    return clamp(SJQ_RESPONSE_MAX_UNITS - diff, 0, SJQ_RESPONSE_MAX_UNITS)
}

export function scoreSJQQuestionUnits(question, answer) {
    if (!question || !Array.isArray(question.responses)) return { earned: 0, total: 0 }

    const responses = question.responses
    const expectedMap = question.correct_answer || {}
    const actualMap = answer && typeof answer === 'object' ? answer : null
    const total = responses.length * SJQ_RESPONSE_MAX_UNITS

    let earned = 0
    for (const response of responses) {
        const expected = expectedMap?.[response.id]
        const actual = actualMap?.[response.id]
        earned += scoreSJQResponseUnits(expected, actual)
    }

    return { earned, total }
}

function getResponseCompetencyWeights(question, response) {
    const raw = response?.competencies

    if (Array.isArray(raw) && raw.length > 0) {
        const normalized = raw
            .map((item) => ({
                id: normalizeSJQCompetencyId(item?.id),
                weight: Number(item?.weight),
            }))
            .filter((item) => Number.isFinite(item.weight) && item.weight > 0)

        const sum = normalized.reduce((acc, item) => acc + item.weight, 0)
        if (sum > 0) {
            return normalized.map((item) => ({ ...item, weight: item.weight / sum }))
        }
    }

    return [{ id: normalizeSJQCompetencyId(question?.competency), weight: 1 }]
}

export function buildSJQCompetencyBreakdownFromQuestionResults(questionResults) {
    const totals = SJQ_COMPETENCIES.reduce((accumulator, item) => {
        accumulator[item.id] = { earned: 0, total: 0 }
        return accumulator
    }, {})

    for (const result of questionResults || []) {
        if (result?.subtest !== 'situational_judgement') continue

        const question = result
        const responses = Array.isArray(question.responses) ? question.responses : []
        const expectedMap = question?.correct_answer || {}
        const actualMap = result?.answer && typeof result.answer === 'object' ? result.answer : {}

        for (const response of responses) {
            const weights = getResponseCompetencyWeights(question, response)
            const earnedUnits = scoreSJQResponseUnits(expectedMap?.[response.id], actualMap?.[response.id])

            for (const { id, weight } of weights) {
                totals[id].earned += earnedUnits * weight
                totals[id].total += SJQ_RESPONSE_MAX_UNITS * weight
            }
        }
    }

    return SJQ_COMPETENCIES.map((item) => {
        const earned = totals[item.id].earned
        const total = totals[item.id].total
        const pct = total > 0 ? Math.round((earned / total) * 100) : 0

        return {
            ...item,
            earned,
            total,
            pct,
        }
    })
}

export function buildSJQCompetencyBreakdownFromAttempt(questionBankById, answersByQuestionId) {
    const answersMap = answersByQuestionId && typeof answersByQuestionId === 'object' ? answersByQuestionId : {}
    const totals = SJQ_COMPETENCIES.reduce((accumulator, item) => {
        accumulator[item.id] = { earned: 0, total: 0 }
        return accumulator
    }, {})

    for (const [questionId, answer] of Object.entries(answersMap)) {
        const question = questionBankById?.get
            ? questionBankById.get(questionId)
            : questionBankById?.[questionId]

        if (!question || question.subtest !== 'situational_judgement') continue
        const responses = Array.isArray(question.responses) ? question.responses : []
        const expectedMap = question.correct_answer || {}
        const actualMap = answer && typeof answer === 'object' ? answer : {}

        for (const response of responses) {
            const weights = getResponseCompetencyWeights(question, response)
            const earnedUnits = scoreSJQResponseUnits(expectedMap?.[response.id], actualMap?.[response.id])

            for (const { id, weight } of weights) {
                totals[id].earned += earnedUnits * weight
                totals[id].total += SJQ_RESPONSE_MAX_UNITS * weight
            }
        }
    }

    return SJQ_COMPETENCIES.map((item) => {
        const earned = totals[item.id].earned
        const total = totals[item.id].total
        const pct = total > 0 ? Math.round((earned / total) * 100) : 0
        return { ...item, earned, total, pct }
    })
}

export function buildSJQRollingProfileFromAttempts(attempts, questionBankById, { maxAttempts = 10 } = {}) {
    const sjqAttempts = (attempts || [])
        .filter((attempt) => attempt?.assessment_type === 'nlng_sjq')
        .slice(0, maxAttempts)

    const totals = SJQ_COMPETENCIES.reduce((accumulator, item) => {
        accumulator[item.id] = { earned: 0, total: 0 }
        return accumulator
    }, {})

    let attemptsUsed = 0

    for (const attempt of sjqAttempts) {
        const answers = attempt?.answers
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) continue

        const breakdown = buildSJQCompetencyBreakdownFromAttempt(questionBankById, answers)
        const hasAny = breakdown.some((item) => item.total > 0)
        if (!hasAny) continue

        attemptsUsed += 1
        for (const item of breakdown) {
            totals[item.id].earned += item.earned
            totals[item.id].total += item.total
        }
    }

    const breakdown = SJQ_COMPETENCIES.map((item) => {
        const earned = totals[item.id].earned
        const total = totals[item.id].total
        const pct = total > 0 ? Math.round((earned / total) * 100) : 0
        return { ...item, earned, total, pct }
    })

    return {
        attemptsUsed,
        breakdown,
    }
}
