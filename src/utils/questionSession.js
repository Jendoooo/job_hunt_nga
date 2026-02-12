function normalizeText(value) {
    if (value === null || value === undefined) return ''

    if (typeof value === 'object') {
        return stableSerialize(value)
    }

    return String(value)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeForComparison(value) {
    if (value === null || typeof value !== 'object') return value

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

function questionSignature(question) {
    const options = Array.isArray(question?.options)
        ? question.options.map((option) => normalizeText(option)).join('||')
        : ''

    return [
        normalizeText(question?.subtest),
        normalizeText(question?.section),
        normalizeText(question?.context),
        normalizeText(question?.question),
        options,
        normalizeText(question?.correctAnswer),
    ].join('###')
}

export function dedupeQuestionsByContent(questions) {
    const seen = new Set()
    const unique = []

    for (const question of questions || []) {
        const signature = questionSignature(question)
        if (seen.has(signature)) continue
        seen.add(signature)
        unique.push(question)
    }

    return unique
}

export function shuffleQuestions(items) {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[randomIndex]] = [next[randomIndex], next[i]]
    }
    return next
}

export function selectUniqueSessionQuestions(questions, count) {
    const unique = dedupeQuestionsByContent(questions)
    return shuffleQuestions(unique).slice(0, Math.min(count, unique.length))
}
