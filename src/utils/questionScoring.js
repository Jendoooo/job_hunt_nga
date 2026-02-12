function normalizeForComparison(value) {
    if (value === null || typeof value !== 'object') {
        return value
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeForComparison(item))
    }

    return Object.keys(value)
        .sort()
        .reduce((accumulator, key) => {
            accumulator[key] = normalizeForComparison(value[key])
            return accumulator
        }, {})
}

function stableSerialize(value) {
    return JSON.stringify(normalizeForComparison(value))
}

function numericValue(value) {
    const next = Number(value)
    return Number.isFinite(next) ? next : null
}

function compareWithTolerance(actual, expected, tolerance = 0) {
    const left = numericValue(actual)
    const right = numericValue(expected)
    if (left === null || right === null) return false
    return Math.abs(left - right) <= tolerance
}

export function isInteractiveQuestionType(type) {
    return [
        'interactive_drag_table',
        'interactive_pie_chart',
        'interactive_stacked_bar',
    ].includes(type)
}

export function hasAnsweredValue(answer) {
    if (answer === null || answer === undefined) return false
    if (typeof answer === 'string') return answer.trim().length > 0
    if (typeof answer === 'object') return Object.keys(answer).length > 0
    return true
}

function evaluateDragTable(question, answer) {
    if (!answer || typeof answer !== 'object') return false
    const expected = question.correct_answer || question.correctAnswer || {}
    return stableSerialize(answer) === stableSerialize(expected)
}

function evaluatePieChart(question, answer) {
    if (!answer || typeof answer !== 'object') return false

    const expected = question.correct_answer || question.correctAnswer || {}
    const tolerance = question?.tolerance?.pct ?? 2

    const expectedIds = Object.keys(expected)
    if (expectedIds.length === 0) return false

    return expectedIds.every((segmentId) =>
        compareWithTolerance(answer[segmentId], expected[segmentId], tolerance)
    )
}

function evaluateStackedBar(question, answer) {
    if (!answer || typeof answer !== 'object') return false

    const expected = question.correct_answer || question.correctAnswer || {}
    const totalTolerance = question?.tolerance?.total ?? 0
    const splitTolerance = question?.tolerance?.split_pct ?? 0

    if (expected && typeof expected.total === 'number' && typeof expected.split_pct === 'number') {
        return (
            compareWithTolerance(answer.total, expected.total, totalTolerance) &&
            compareWithTolerance(answer.split_pct, expected.split_pct, splitTolerance)
        )
    }

    const expectedBarIds = Object.keys(expected)
    if (expectedBarIds.length === 0) return false

    return expectedBarIds.every((barId) => {
        const expectedBar = expected[barId]
        const answerBar = answer?.[barId]

        if (!expectedBar || typeof expectedBar !== 'object') return false
        if (!answerBar || typeof answerBar !== 'object') return false

        const perBarTotalTolerance = question?.tolerance?.bars?.[barId]?.total ?? totalTolerance
        const perBarSplitTolerance = question?.tolerance?.bars?.[barId]?.split_pct ?? splitTolerance

        return (
            compareWithTolerance(answerBar.total, expectedBar.total, perBarTotalTolerance) &&
            compareWithTolerance(answerBar.split_pct, expectedBar.split_pct, perBarSplitTolerance)
        )
    })
}

function evaluateStandardQuestion(question, answer) {
    const expected = question.correctAnswer
    if (expected === undefined) return false

    if (typeof expected === 'object') {
        return stableSerialize(answer) === stableSerialize(expected)
    }

    return answer === expected
}

export function evaluateQuestionAnswer(question, answer) {
    if (!question) return false

    if (!hasAnsweredValue(answer)) return false

    switch (question.type) {
        case 'interactive_drag_table':
            return evaluateDragTable(question, answer)
        case 'interactive_pie_chart':
            return evaluatePieChart(question, answer)
        case 'interactive_stacked_bar':
            return evaluateStackedBar(question, answer)
        default:
            return evaluateStandardQuestion(question, answer)
    }
}

export function buildQuestionResults(questions, answers) {
    return (questions || []).map((question, index) => {
        const answer = answers[index]
        const answered = hasAnsweredValue(answer)
        const correct = evaluateQuestionAnswer(question, answer)

        return {
            ...question,
            index,
            answer,
            answered,
            correct,
        }
    })
}
