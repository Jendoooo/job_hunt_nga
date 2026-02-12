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
        'interactive_tabbed_evaluation',
        'interactive_point_graph',
    ].includes(type)
}

function hasNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0
}

function getTabbedExpectedMap(question) {
    const raw = question?.correct_answer || question?.correctAnswer || {}
    if (raw && typeof raw === 'object' && raw.answers && typeof raw.answers === 'object') {
        return raw.answers
    }
    return raw && typeof raw === 'object' ? raw : {}
}

function getPointGraphExpectedValues(question) {
    const raw = question?.correct_answer || question?.correctAnswer || {}

    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object' && Array.isArray(raw.values)) return raw.values

    if (raw && typeof raw === 'object') {
        const labels = Array.isArray(question?.widget_data?.x_axis_labels)
            ? question.widget_data.x_axis_labels
            : []

        if (labels.length > 0 && labels.every((label) => raw[label] !== undefined)) {
            return labels.map((label) => raw[label])
        }

        return Object.values(raw)
    }

    return []
}

export function hasAnsweredValue(answer, question = null) {
    if (answer === null || answer === undefined) return false

    if (question?.subtest === 'situational_judgement') {
        if (!answer || typeof answer !== 'object') return false

        const responses = Array.isArray(question?.responses) ? question.responses : []
        if (responses.length === 0) return Object.keys(answer).length > 0

        return responses.every((r) => answer[r.id] !== null && answer[r.id] !== undefined)
    }

    if (question?.type === 'interactive_tabbed_evaluation') {
        if (typeof answer !== 'object') return false

        const tabs = Array.isArray(question?.widget_data?.tabs) ? question.widget_data.tabs : []
        const tabIds = tabs.map((tab) => tab?.id).filter(Boolean)

        if (tabIds.length === 0) {
            return Object.keys(answer).length > 0
        }

        return tabIds.every((tabId) => hasNonEmptyString(answer[tabId]))
    }

    if (question?.type === 'interactive_point_graph') {
        const values = Array.isArray(answer)
            ? answer
            : (answer && typeof answer === 'object' ? answer.values : null)

        if (!Array.isArray(values) || values.length === 0) return false

        const labels = Array.isArray(question?.widget_data?.x_axis_labels)
            ? question.widget_data.x_axis_labels
            : []

        return labels.length > 0 ? values.length === labels.length : values.length > 0
    }

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

function evaluateTabbedEvaluation(question, answer) {
    if (!answer || typeof answer !== 'object') return false

    const expectedMap = getTabbedExpectedMap(question)
    const tabIds = Array.isArray(question?.widget_data?.tabs)
        ? question.widget_data.tabs.map((tab) => tab?.id).filter(Boolean)
        : []
    const keys = tabIds.length > 0 ? tabIds : Object.keys(expectedMap)

    if (keys.length === 0) return false

    return keys.every((key) => {
        const expected = expectedMap[key]
        if (!hasNonEmptyString(expected)) return false
        return String(answer[key] || '').trim() === String(expected).trim()
    })
}

function evaluatePointGraph(question, answer) {
    const actualValues = Array.isArray(answer)
        ? answer
        : (answer && typeof answer === 'object' && Array.isArray(answer.values) ? answer.values : null)
    if (!Array.isArray(actualValues) || actualValues.length === 0) return false

    const expectedValues = getPointGraphExpectedValues(question)
    if (!Array.isArray(expectedValues) || expectedValues.length === 0) return false
    if (actualValues.length !== expectedValues.length) return false

    const tolerance = question?.tolerance?.value
        ?? question?.tolerance?.point
        ?? question?.tolerance?.y
        ?? 1

    return expectedValues.every((expected, index) =>
        compareWithTolerance(actualValues[index], expected, tolerance)
    )
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

    if (!hasAnsweredValue(answer, question)) return false

    if (question.subtest === 'situational_judgement') {
        if (!answer || typeof answer !== 'object') return false
        const responses = question.responses || []
        const correctMap = question.correct_answer || {}
        return responses.every((r) => {
            return Number(answer[r.id]) === Number(correctMap[r.id])
        })
    }

    switch (question.type) {
        case 'interactive_drag_table':
            return evaluateDragTable(question, answer)
        case 'interactive_pie_chart':
            return evaluatePieChart(question, answer)
        case 'interactive_stacked_bar':
            return evaluateStackedBar(question, answer)
        case 'interactive_tabbed_evaluation':
            return evaluateTabbedEvaluation(question, answer)
        case 'interactive_point_graph':
            return evaluatePointGraph(question, answer)
        default:
            return evaluateStandardQuestion(question, answer)
    }
}

export function scoreSJQQuestion(question, answer) {
    if (!answer || typeof answer !== 'object') return 0
    const responses = question?.responses || []
    const correctMap = question?.correct_answer || {}
    const correct = responses.filter((r) => Number(answer[r.id]) === Number(correctMap[r.id])).length
    return responses.length > 0 ? (correct / responses.length) * 100 : 0
}

export function buildQuestionResults(questions, answers) {
    return (questions || []).map((question, index) => {
        const answer = answers[index]
        const answered = hasAnsweredValue(answer, question)
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
