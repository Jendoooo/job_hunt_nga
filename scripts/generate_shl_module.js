import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUTPUT_FILE = resolve(ROOT, 'src/data/shl-interactive-questions.json')
const GOLD_STANDARD_FILE = resolve(ROOT, 'src/data/shl-gold-standard.json')
const QUESTION_COUNT = 50

function createSeededRandom(seed = 20260212) {
    let state = seed % 2147483647
    if (state <= 0) state += 2147483646

    return () => {
        state = (state * 16807) % 2147483647
        return (state - 1) / 2147483646
    }
}

const random = createSeededRandom()

function pick(list) {
    return list[Math.floor(random() * list.length)]
}

function normalizeDifficulty(value, fallback = 'medium') {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') {
        return normalized
    }
    return fallback
}

function inferDifficulty(question, index = 0) {
    const explicit = normalizeDifficulty(question?.difficulty, '')
    if (explicit) return explicit

    if (question?.subtype === 'interactive_numerical_hard') return 'hard'

    if (question?.type === 'interactive_drag_table') {
        const rules = Array.isArray(question?.prompt_rules) ? question.prompt_rules : []
        if (rules.length <= 2) return 'easy'
    }

    if (question?.type === 'interactive_pie_chart') {
        const segmentCount = Array.isArray(question?.widget_data?.segments) ? question.widget_data.segments.length : 0
        if (segmentCount > 0 && segmentCount <= 3) return 'easy'
    }

    if (question?.type === 'interactive_stacked_bar') {
        const growthLine = (Array.isArray(question?.prompt_rules) ? question.prompt_rules : [])
            .find((line) => String(line).toLowerCase().includes('month 2'))
        if (growthLine) {
            const growthRates = String(growthLine).match(/\+(\d+)%/g) || []
            const numericRates = growthRates
                .map((token) => Number(token.replace(/\D/g, '')))
                .filter((value) => Number.isFinite(value))
            if (numericRates.length >= 2 && Math.max(...numericRates) <= 15) return 'easy'
        }
    }

    if (question?.type === 'interactive_tabbed_evaluation') {
        return 'medium'
    }

    if (question?.type === 'interactive_point_graph') {
        return 'hard'
    }

    return index % 6 === 0 ? 'easy' : 'medium'
}

function titleCase(value) {
    return String(value || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ')
}

function parseGoldSource(rawText) {
    const trimmed = String(rawText || '').trim()
    const startIndex = trimmed.indexOf('[')
    const endIndex = trimmed.lastIndexOf(']')
    const candidate = startIndex >= 0 && endIndex > startIndex
        ? trimmed.slice(startIndex, endIndex + 1)
        : trimmed

    try {
        return JSON.parse(candidate)
    } catch {
        // Fallback for JSON-like arrays with inline comments/trailing commas.
        return Function(`"use strict"; return (${candidate});`)()
    }
}

function defaultPieColor(index) {
    return ['blue', 'green', 'orange', 'red', 'teal', 'indigo'][index % 6]
}

function defaultDraggablesFromAnswer(correctAnswer) {
    const ids = [...new Set(Object.values(correctAnswer || {}).map((value) => String(value)))]
    return ids.map((id) => ({ id, label: titleCase(id) }))
}

function normalizeGoldQuestion(question, index) {
    if (!question || typeof question !== 'object' || !question.type) return null

    const normalized = {
        ...question,
        subtype: 'interactive_numerical',
        difficulty: normalizeDifficulty(question?.difficulty, inferDifficulty(question, index)),
        question: question?.question || question?.instruction || `Interactive Question ${index + 1}`,
    }

    if (!Array.isArray(normalized.prompt_rules) && Array.isArray(question?.prompt_data?.rules)) {
        normalized.prompt_rules = question.prompt_data.rules.map((rule) => rule?.text).filter(Boolean)
    }

    if (normalized.type === 'interactive_drag_table') {
        const widgetData = normalized.widget_data || {}
        const rows = Array.isArray(widgetData.rows) ? widgetData.rows : []
        const draggables = Array.isArray(widgetData.draggables) && widgetData.draggables.length > 0
            ? widgetData.draggables
            : defaultDraggablesFromAnswer(normalized.correct_answer)

        normalized.widget_data = {
            columns: Array.isArray(widgetData.columns) ? widgetData.columns : [],
            rows,
            draggables,
        }
    }

    if (normalized.type === 'interactive_pie_chart') {
        const answer = normalized.correct_answer && typeof normalized.correct_answer === 'object'
            ? normalized.correct_answer
            : {}
        const answerKeys = Object.keys(answer)
        const widgetData = normalized.widget_data || {}
        const hasSegments = Array.isArray(widgetData.segments) && widgetData.segments.length > 0

        if (!hasSegments && answerKeys.length > 0) {
            const initialSplit = Math.max(1, Math.floor(100 / answerKeys.length))
            const segments = answerKeys.map((key, segmentIndex) => ({
                id: key,
                label: titleCase(key),
                color: defaultPieColor(segmentIndex),
                initial_pct: initialSplit,
            }))

            normalized.widget_data = {
                ...widgetData,
                total_value: Number(question?.prompt_data?.total_value || widgetData.total_value || 100),
                segments,
            }
        } else {
            normalized.widget_data = {
                ...widgetData,
                total_value: Number(widgetData.total_value || question?.prompt_data?.total_value || 100),
                segments: widgetData.segments,
            }
        }

        if (!normalized.tolerance) {
            normalized.tolerance = { pct: 2 }
        }
    }

    if (normalized.type === 'interactive_stacked_bar') {
        const widgetData = normalized.widget_data || {}

        // SHL stacked-bar questions typically allow adjusting both bars in the prompt.
        // If the gold question uses { bar_1, bar_2_initial } with a single correct_answer,
        // convert it into a 2-bar interactive set with a per-bar expected answer map.
        const bar1 = widgetData?.bar_1
        const bar2 = widgetData?.bar_2_initial
        const hasInteractiveBars = Array.isArray(widgetData?.interactive_bars) && widgetData.interactive_bars.length > 0
        const hasReferenceBars = Array.isArray(widgetData?.reference_bars) && widgetData.reference_bars.length > 0
        const hasReferenceBar = Boolean(widgetData?.reference_bar)
        const hasSingleExpected = normalized?.correct_answer && typeof normalized.correct_answer === 'object'
            && typeof normalized.correct_answer.total === 'number'
            && typeof normalized.correct_answer.split_pct === 'number'

        if (bar1 && bar2 && !hasInteractiveBars && !hasReferenceBars && !hasReferenceBar && hasSingleExpected) {
            const bar1Id = String(bar1.id || 'bar_1')
            const bar2Id = String(bar2.id || 'bar_2')
            const expectedSplit1 = Number(bar1.split_pct)
            const initialSplit1 = Number.isFinite(expectedSplit1)
                ? (expectedSplit1 === 50 ? 45 : 50)
                : 50

            normalized.widget_data = {
                ...widgetData,
                interactive_bars: [
                    {
                        id: bar1Id,
                        label: bar1.label || 'Bar 1',
                        total: Number(bar1.total),
                        split_pct: clamp(initialSplit1, 5, 95),
                    },
                    {
                        id: bar2Id,
                        label: bar2.label || 'Bar 2',
                        total: Number(bar2.total),
                        split_pct: Number(bar2.split_pct),
                    },
                ],
            }
            delete normalized.widget_data.bar_1
            delete normalized.widget_data.bar_2_initial

            normalized.correct_answer = {
                [bar1Id]: {
                    total: Number(bar1.total),
                    split_pct: Number(bar1.split_pct),
                },
                [bar2Id]: {
                    total: Number(normalized.correct_answer.total),
                    split_pct: Number(normalized.correct_answer.split_pct),
                },
            }
        } else {
            normalized.widget_data = widgetData
        }

        if (!normalized.tolerance) {
            normalized.tolerance = { total: 5, split_pct: 2 }
        }
    }

    if (normalized.type === 'interactive_tabbed_evaluation') {
        const widgetData = normalized.widget_data || {}
        const tabs = Array.isArray(widgetData.tabs) ? widgetData.tabs : []
        const columns = Array.isArray(widgetData.columns) && widgetData.columns.length > 0
            ? widgetData.columns
            : null
        const approvalLabel = typeof widgetData.approval_label === 'string' && widgetData.approval_label.trim().length > 0
            ? widgetData.approval_label.trim()
            : null
        const expected = normalized.correct_answer && typeof normalized.correct_answer === 'object'
            ? normalized.correct_answer
            : {}
        const hasOptions = Array.isArray(widgetData.options) && widgetData.options.length > 0

        const optionIds = hasOptions
            ? widgetData.options.map((option) => String(option.id))
            : [...new Set(Object.values(expected).map((value) => String(value)))]

        normalized.widget_data = {
            tabs,
            options: hasOptions
                ? widgetData.options
                : optionIds.map((id) => ({ id, label: titleCase(id) })),
            ...(columns ? { columns } : {}),
            ...(approvalLabel ? { approval_label: approvalLabel } : {}),
        }
    }

    if (normalized.type === 'interactive_point_graph') {
        const widgetData = normalized.widget_data || {}
        const xAxisLabels = Array.isArray(widgetData.x_axis_labels) ? widgetData.x_axis_labels : []
        const yAxis = widgetData.y_axis && typeof widgetData.y_axis === 'object'
            ? widgetData.y_axis
            : { min: 0, max: 100, step: 10, label: '' }
        const initialValues = Array.isArray(widgetData.initial_values)
            ? widgetData.initial_values
            : Array.from({ length: xAxisLabels.length }, () => yAxis.min)

        normalized.widget_data = {
            x_axis_labels: xAxisLabels,
            y_axis: {
                min: Number(yAxis.min ?? 0),
                max: Number(yAxis.max ?? 100),
                step: Number(yAxis.step ?? 10),
                label: String(yAxis.label ?? ''),
                ...(Number.isFinite(Number(yAxis.tick_step)) && Number(yAxis.tick_step) > 0
                    ? { tick_step: Number(yAxis.tick_step) }
                    : {}),
            },
            initial_values: initialValues,
        }

        if (!normalized.tolerance) {
            normalized.tolerance = { value: 1 }
        }
    }

    return normalized
}

function loadGoldStandardQuestions() {
    if (!existsSync(GOLD_STANDARD_FILE)) {
        console.warn(`Gold standard source not found at ${GOLD_STANDARD_FILE}. Using generated fallback set only.`)
        return []
    }

    try {
        const raw = parseGoldSource(readFileSync(GOLD_STANDARD_FILE, 'utf8'))
        if (!Array.isArray(raw)) {
            console.warn(`Gold standard source is not an array. Using generated fallback set only.`)
            return []
        }

        return raw
            .map((question, index) => normalizeGoldQuestion(question, index))
            .filter((question) => question && question?.subtype === 'interactive_numerical')
    } catch (error) {
        console.warn(`Failed to parse gold standard source. Using generated fallback set only.`, error?.message || error)
        return []
    }
}

function randomInt(min, max) {
    return Math.floor(random() * (max - min + 1)) + min
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function shuffle(list) {
    const next = [...list]
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1))
        ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    }
    return next
}

function toPct(part, total) {
    return Math.round((part / total) * 100)
}

function formatMoney(value) {
    return `$${Number(value).toFixed(2)}`
}

function normalizeIntegerPercentages(values, minimum = 1) {
    const safe = values.map((value) => Math.max(minimum, Math.round(value)))
    const total = safe.reduce((sum, value) => sum + value, 0)
    let delta = 100 - total

    const indexes = safe
        .map((value, index) => ({ value, index }))
        .sort((a, b) => b.value - a.value)
        .map((entry) => entry.index)

    let pointer = 0
    while (delta !== 0 && pointer < 400) {
        const index = indexes[pointer % indexes.length]
        if (delta > 0) {
            safe[index] += 1
            delta -= 1
        } else if (safe[index] > minimum) {
            safe[index] -= 1
            delta += 1
        }
        pointer += 1
    }

    return safe
}

function progressiveAmount(miles, tiers) {
    let amount = 0
    let covered = 0

    for (const tier of tiers) {
        const upperBound = tier.upTo
        const tierDistance = upperBound === Infinity
            ? Math.max(0, miles - covered)
            : Math.max(0, Math.min(miles, upperBound) - covered)

        amount += tierDistance * tier.rate
        covered += tierDistance
    }

    return Number(amount.toFixed(2))
}

function buildInitialPercentages(correctMap, segmentIds) {
    const shifted = segmentIds.map((segmentId) => {
        const correct = Number(correctMap[segmentId] || 0)
        return clamp(correct + pick([-8, -6, -4, -2, 2, 4, 6, 8]), 4, 92)
    })
    const sum = shifted.reduce((total, value) => total + value, 0) || 1
    const scaled = shifted.map((value) => (value / sum) * 100)
    const normalized = normalizeIntegerPercentages(scaled, 1)

    const initial = {}
    segmentIds.forEach((segmentId, index) => {
        initial[segmentId] = normalized[index]
    })
    return initial
}

function formatEquationTerm(label, coefficient) {
    return coefficient === 1 ? label : `${coefficient} x ${label}`
}

function createEquationRule(targetValues, labels) {
    const shuffledLabels = shuffle(labels)
    const termCount = randomInt(2, Math.min(4, labels.length))
    const pickedLabels = shuffledLabels.slice(0, termCount)
    const terms = pickedLabels.map((label) => ({
        label,
        coefficient: pick([1, 1, 2, 2, 3]),
    }))

    const result = terms.reduce((sum, term) => {
        return sum + (targetValues[term.label] * term.coefficient)
    }, 0)

    const expression = terms
        .map((term) => formatEquationTerm(term.label, term.coefficient))
        .join(' + ')

    return `${expression} = ${result}%`
}

function createStandardTableQuestion(id) {
    const variants = ['commission', 'funding', 'penalty']
    const variant = variants[id % variants.length]

    if (variant === 'commission') {
        const threshold = pick([10, 12, 14, 15])
        const reps = ['Rep A', 'Rep B', 'Rep C', 'Rep D'].map((label, index) => {
            const sales = randomInt(120, 260)
            const returns = randomInt(1, 18)
            const netSales = randomInt(90, 220)
            const score = ((sales - returns * 5) / netSales) * 100

            return {
                id: `q${id}_r${index + 1}`,
                values: [label, String(sales), String(returns), String(netSales)],
                result: score >= threshold ? 'high_bonus' : 'standard_bonus',
            }
        })

        return {
            id,
            type: 'interactive_drag_table',
            subtype: 'interactive_numerical',
            difficulty: 'medium',
            instruction: 'Classify each row using the commission rule.',
            question: 'Drag the correct outcome label for each sales rep.',
            prompt_rules: [
                'Commission Score = (Sales - Returns x 5) / Net Sales',
                `High Bonus if Commission Score >= ${threshold}%`,
                'Otherwise classify as Standard Bonus',
            ],
            widget_data: {
                columns: ['Rep', 'Sales', 'Returns', 'Net Sales', 'Result'],
                rows: reps.map(({ id: rowId, values }) => ({ id: rowId, values })),
                draggables: [
                    { id: 'high_bonus', label: 'High Bonus' },
                    { id: 'standard_bonus', label: 'Standard Bonus' },
                ],
            },
            correct_answer: reps.reduce((accumulator, row) => {
                accumulator[row.id] = row.result
                return accumulator
            }, {}),
            explanation: 'Use the commission formula exactly and compare each score to the threshold.',
        }
    }

    if (variant === 'funding') {
        const projects = ['Plant Retrofit', 'Tank Farm', 'Pipeline', 'Controls Upgrade'].map((name, index) => {
            const investment = randomInt(45, 160)
            const revenue = randomInt(60, 280)
            const result = revenue >= investment * 2 ? 'priority' : 'watchlist'

            return {
                id: `q${id}_r${index + 1}`,
                values: [name, String(investment), String(revenue)],
                result,
            }
        })

        return {
            id,
            type: 'interactive_drag_table',
            subtype: 'interactive_numerical',
            difficulty: 'easy',
            instruction: 'Classify each project based on revenue-to-investment coverage.',
            question: 'Assign the right funding category for each project.',
            prompt_rules: [
                'Priority if Revenue >= 2 x Investment',
                'Watchlist if Revenue < 2 x Investment',
            ],
            widget_data: {
                columns: ['Project', 'Investment (M)', 'Revenue (M)', 'Category'],
                rows: projects.map(({ id: rowId, values }) => ({ id: rowId, values })),
                draggables: [
                    { id: 'priority', label: 'Priority' },
                    { id: 'watchlist', label: 'Watchlist' },
                ],
            },
            correct_answer: projects.reduce((accumulator, row) => {
                accumulator[row.id] = row.result
                return accumulator
            }, {}),
            explanation: 'Compute 2 x Investment and compare it directly with Revenue.',
        }
    }

    const staffRows = ['Operator 1', 'Operator 2', 'Operator 3', 'Operator 4'].map((name, index) => {
        const totalDays = pick([120, 125, 130, 140])
        const attended = randomInt(108, totalDays)
        const lateness = randomInt(0, 8)
        const lateRate = (lateness / totalDays) * 100
        const attendanceRate = (attended / totalDays) * 100
        const flagged = lateRate > 1.5 || attendanceRate < 93

        return {
            id: `q${id}_r${index + 1}`,
            values: [name, String(attended), String(totalDays), String(lateness)],
            result: flagged ? 'not_eligible' : 'eligible',
        }
    })

    return {
        id,
        type: 'interactive_drag_table',
        subtype: 'interactive_numerical',
        difficulty: 'medium',
        instruction: 'Determine each operator eligibility status.',
        question: 'Classify each operator as Eligible or Not Eligible.',
        prompt_rules: [
            'Late > 1.5% => Flag',
            'Attendance < 93% => Flag',
            'Any flag => Not Eligible',
        ],
        widget_data: {
            columns: ['Operator', 'Days Attended', 'Total Days', 'Lateness', 'Result'],
            rows: staffRows.map(({ id: rowId, values }) => ({ id: rowId, values })),
            draggables: [
                { id: 'eligible', label: 'Eligible' },
                { id: 'not_eligible', label: 'Not Eligible' },
            ],
        },
        correct_answer: staffRows.reduce((accumulator, row) => {
            accumulator[row.id] = row.result
            return accumulator
        }, {}),
        explanation: 'Calculate lateness and attendance rates first, then apply both policy rules.',
    }
}

function createTieredTableQuestion(id) {
    const tierPresets = [
        [
            { upTo: 200, rate: 0.5 },
            { upTo: Infinity, rate: 0.25 },
        ],
        [
            { upTo: 250, rate: 0.11 },
            { upTo: 500, rate: 0.1 },
            { upTo: Infinity, rate: 0.05 },
        ],
        [
            { upTo: 180, rate: 0.65 },
            { upTo: 420, rate: 0.4 },
            { upTo: Infinity, rate: 0.2 },
        ],
    ]

    const tiers = pick(tierPresets)
    const rows = ['Alice', 'Binta', 'Chidi', 'Daniel'].map((name, index) => {
        const miles = randomInt(120, 780)
        const trueAmount = progressiveAmount(miles, tiers)
        const isCorrect = random() > 0.45
        const offset = pick([4.25, 6.5, 8.75, 11.0, 13.25])
        const claimedAmount = isCorrect ? trueAmount : Number((trueAmount + (random() > 0.5 ? offset : -offset)).toFixed(2))

        return {
            id: `q${id}_r${index + 1}`,
            values: [name, String(miles), formatMoney(claimedAmount)],
            result: isCorrect ? 'correct' : 'incorrect',
        }
    })

    const ruleLines = tiers.map((tier, index) => {
        const lower = index === 0 ? 0 : tiers[index - 1].upTo + 1
        const upper = tier.upTo === Infinity ? `${lower}+` : `${lower}-${tier.upTo}`
        return `${upper} miles: ${formatMoney(tier.rate)}/mile`
    })

    return {
        id,
        type: 'interactive_drag_table',
        subtype: 'interactive_numerical_hard',
        difficulty: 'hard',
        instruction: 'Verify if each travel expense claim is correct.',
        question: 'Use the tiered mileage policy and classify each claim.',
        prompt_rules: ruleLines,
        widget_data: {
            columns: ['Employee', 'Total Miles', 'Claimed Amount', 'Status'],
            rows: rows.map(({ id: rowId, values }) => ({ id: rowId, values })),
            draggables: [
                { id: 'correct', label: 'Correct', color: 'green' },
                { id: 'incorrect', label: 'Incorrect', color: 'red' },
            ],
        },
        correct_answer: rows.reduce((accumulator, row) => {
            accumulator[row.id] = row.result
            return accumulator
        }, {}),
        explanation: 'Apply each mileage tier progressively before comparing to the claimed amount.',
    }
}

function createTableQuestion(id, hardMode = false) {
    return hardMode ? createTieredTableQuestion(id) : createStandardTableQuestion(id)
}

function createStandardPieQuestion(id) {
    const ratioTemplates = [
        [1, 1, 2, 6],
        [1, 2, 3, 4],
        [2, 3, 5],
        [1, 2, 2, 5],
        [2, 2, 3, 3],
    ]
    const template = pick(ratioTemplates)
    const labels = ['Office A', 'Office B', 'Office C', 'Office D', 'Office E']
    const colors = ['blue', 'green', 'orange', 'purple', 'teal']

    const ratioSum = template.reduce((sum, value) => sum + value, 0)
    const anchorUnits = pick([12, 18, 24, 30, 36])
    const totalValue = anchorUnits * ratioSum

    const segments = template.map((ratioValue, index) => {
        const pct = toPct(ratioValue, ratioSum)
        return {
            id: `seg_${id}_${index + 1}`,
            label: labels[index],
            color: colors[index],
            correct_pct: pct,
        }
    })

    const correctAnswer = segments.reduce((accumulator, segment) => {
        accumulator[segment.id] = segment.correct_pct
        return accumulator
    }, {})
    const initialPct = buildInitialPercentages(correctAnswer, segments.map((segment) => segment.id))
    const ratioExpression = segments
        .map((segment, index) => `${segment.label}:${template[index]}`)
        .join(' | ')

    return {
        id,
        type: 'interactive_pie_chart',
        subtype: 'interactive_numerical',
        difficulty: 'medium',
        instruction: 'Adjust the pie chart to satisfy the ratio model.',
        question: 'Resize segments to match the office ratio rules.',
        prompt_rules: [
            `Total value = ${totalValue}`,
            `Ratio units -> ${ratioExpression}`,
        ],
        widget_data: {
            total_value: totalValue,
            segments: segments.map((segment) => ({
                id: segment.id,
                label: segment.label,
                color: segment.color,
                initial_pct: initialPct[segment.id],
            })),
        },
        correct_answer: correctAnswer,
        tolerance: {
            pct: 2,
        },
        explanation: 'Convert each ratio part into a percentage of the total ratio sum.',
    }
}

function createEquationPieQuestion(id) {
    let engineering = 0
    let product = 0
    let finance = 0
    let marketing = 0

    while (true) {
        engineering = randomInt(16, 34)
        product = randomInt(15, 32)
        finance = randomInt(12, 32)
        marketing = 100 - engineering - product - finance
        if (marketing >= 10 && marketing <= 32) break
    }

    const segments = [
        { id: `seg_${id}_eng`, label: 'Engineering', color: 'blue', correct_pct: engineering },
        { id: `seg_${id}_prd`, label: 'Product', color: 'green', correct_pct: product },
        { id: `seg_${id}_fin`, label: 'Finance', color: 'orange', correct_pct: finance },
        { id: `seg_${id}_mkt`, label: 'Marketing', color: 'purple', correct_pct: marketing },
    ]

    const values = {
        Engineering: engineering,
        Product: product,
        Finance: finance,
        Marketing: marketing,
    }

    const labels = ['Engineering', 'Product', 'Finance', 'Marketing']
    const equations = []
    const seenExpressions = new Set()
    let guard = 0
    while (equations.length < 3 && guard < 40) {
        const rule = createEquationRule(values, labels)
        if (!seenExpressions.has(rule)) {
            seenExpressions.add(rule)
            equations.push(rule)
        }
        guard += 1
    }
    equations.push('Engineering + Product + Finance + Marketing = 100%')

    const correctAnswer = segments.reduce((accumulator, segment) => {
        accumulator[segment.id] = segment.correct_pct
        return accumulator
    }, {})
    const initialPct = buildInitialPercentages(correctAnswer, segments.map((segment) => segment.id))

    return {
        id,
        type: 'interactive_pie_chart',
        subtype: 'interactive_numerical_hard',
        difficulty: 'hard',
        instruction: 'Approximate the pie slices that satisfy all equation constraints.',
        question: 'Resize each budget slice to satisfy the system of equations.',
        prompt_rules: equations,
        widget_data: {
            total_value: pick([420, 480, 540, 600]),
            segments: segments.map((segment) => ({
                id: segment.id,
                label: segment.label,
                color: segment.color,
                initial_pct: initialPct[segment.id],
            })),
        },
        correct_answer: correctAnswer,
        tolerance: {
            pct: 2,
        },
        explanation: 'Treat each segment as a variable and solve the linear constraints simultaneously.',
    }
}

function createPieQuestion(id, hardMode = false) {
    return hardMode ? createEquationPieQuestion(id) : createStandardPieQuestion(id)
}

function createStandardBarQuestion(id) {
    const monthOneTotal = pick([160, 180, 200, 220, 240, 260, 280])
    const splitPct = pick([25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75])
    const serviceBase = Math.round((monthOneTotal * splitPct) / 100)
    const productBase = monthOneTotal - serviceBase
    const serviceGrowth = pick([5, 10, 15, 20, 25, 30])
    const productGrowth = pick([10, 15, 20, 25, 30, 35])

    const serviceMonthTwo = Math.round(serviceBase * (1 + serviceGrowth / 100))
    const productMonthTwo = Math.round(productBase * (1 + productGrowth / 100))
    const totalMonthTwo = serviceMonthTwo + productMonthTwo
    const splitMonthTwo = toPct(serviceMonthTwo, totalMonthTwo)
    const axisMax = Math.max(220, Math.ceil((totalMonthTwo + 30) / 50) * 50)

    return {
        id,
        type: 'interactive_stacked_bar',
        subtype: 'interactive_numerical',
        difficulty: 'medium',
        instruction: 'Adjust Month 2 total and Service/Product split.',
        question: 'Move the handles until Month 2 matches the growth rules.',
        prompt_rules: [
            `Month 1: ${monthOneTotal} total (${serviceBase} Service / ${productBase} Product)`,
            `Month 2: Service +${serviceGrowth}%, Product +${productGrowth}%`,
        ],
        widget_data: {
            axis_max: axisMax,
            bar_1: {
                id: 'month_1',
                label: 'Month 1',
                total: monthOneTotal,
                split_pct: splitPct,
            },
            bar_2_initial: {
                id: 'month_2',
                label: 'Month 2',
                total: clamp(monthOneTotal + pick([-20, -10, 10, 20]), 1, axisMax),
                split_pct: clamp(splitPct + pick([-12, -8, -4, 4, 8, 12]), 5, 95),
            },
            segment_labels: {
                primary: 'Service',
                secondary: 'Product',
            },
        },
        correct_answer: {
            total: totalMonthTwo,
            split_pct: splitMonthTwo,
        },
        tolerance: {
            total: 5,
            split_pct: 2,
        },
        explanation: 'Apply each growth rate to Month 1 segment values, then recompute total and Service percentage.',
    }
}

function createHistoricalBarQuestion(id) {
    const yearOneTotal = pick([180, 200, 220, 240])
    const yearOneSmartPct = pick([30, 35, 40, 45, 50])
    const smartphonesYearOne = Math.round((yearOneTotal * yearOneSmartPct) / 100)
    const nonSmartYearOne = yearOneTotal - smartphonesYearOne

    const yearTwoSmartIncrease = pick([40, 50, 60])
    const yearTwoNonSmartShift = pick([-20, -10, 0, 10, 20])
    const smartphonesYearTwo = smartphonesYearOne + yearTwoSmartIncrease
    const nonSmartYearTwo = Math.max(10, nonSmartYearOne + yearTwoNonSmartShift)
    const yearTwoTotal = smartphonesYearTwo + nonSmartYearTwo
    const yearTwoSmartPct = toPct(smartphonesYearTwo, yearTwoTotal)

    const yearThreeNonSmartDropPct = pick([15, 20, 25])
    const yearThreeSmartIncreasePct = pick([20, 25, 30, 35])
    const nonSmartYearThree = Math.round(nonSmartYearOne * (1 - yearThreeNonSmartDropPct / 100))
    const smartphonesYearThree = Math.round(smartphonesYearOne * (1 + yearThreeSmartIncreasePct / 100))
    const yearThreeTotal = smartphonesYearThree + nonSmartYearThree
    const yearThreeSmartPct = toPct(smartphonesYearThree, yearThreeTotal)

    const axisMax = Math.max(
        260,
        Math.ceil((Math.max(yearOneTotal, yearTwoTotal, yearThreeTotal) + 40) / 50) * 50
    )

    return {
        id,
        type: 'interactive_stacked_bar',
        subtype: 'interactive_numerical_hard',
        difficulty: 'hard',
        instruction: 'Use Year 1 as the historical baseline, then build Year 2 and Year 3.',
        question: 'Adjust Year 2 and Year 3 bars to satisfy all historical rules.',
        prompt_rules: [
            `Year 1 baseline: ${yearOneTotal} total (${smartphonesYearOne} smartphones / ${nonSmartYearOne} non-smartphones)`,
            `Year 2 smartphones = Year 1 smartphones + ${yearTwoSmartIncrease}`,
            `Year 2 non-smartphones = Year 1 non-smartphones ${yearTwoNonSmartShift >= 0 ? '+' : '-'} ${Math.abs(yearTwoNonSmartShift)}`,
            `Year 3 non-smartphones dropped by ${yearThreeNonSmartDropPct}% vs Year 1`,
            `Year 3 smartphones increased by ${yearThreeSmartIncreasePct}% vs Year 1`,
        ],
        widget_data: {
            axis_max: axisMax,
            segment_labels: {
                primary: 'Smartphones',
                secondary: 'Non-smartphones',
            },
            reference_bar: {
                id: 'year1',
                label: 'Year 1',
                total: yearOneTotal,
                split_pct: yearOneSmartPct,
            },
            interactive_bars: [
                {
                    id: 'year2',
                    label: 'Year 2',
                    total: clamp(yearTwoTotal + pick([-18, -10, 10, 18]), 1, axisMax),
                    split_pct: clamp(yearTwoSmartPct + pick([-12, -8, -4, 4, 8, 12]), 5, 95),
                },
                {
                    id: 'year3',
                    label: 'Year 3',
                    total: clamp(yearThreeTotal + pick([-18, -10, 10, 18]), 1, axisMax),
                    split_pct: clamp(yearThreeSmartPct + pick([-12, -8, -4, 4, 8, 12]), 5, 95),
                },
            ],
        },
        correct_answer: {
            year2: {
                total: yearTwoTotal,
                split_pct: yearTwoSmartPct,
            },
            year3: {
                total: yearThreeTotal,
                split_pct: yearThreeSmartPct,
            },
        },
        tolerance: {
            total: 5,
            split_pct: 2,
            bars: {
                year2: {
                    total: 5,
                    split_pct: 2,
                },
                year3: {
                    total: 5,
                    split_pct: 2,
                },
            },
        },
        explanation: 'Derive Year 2 and Year 3 counts from Year 1 first, then convert each year to total and smartphone percentage.',
    }
}

function createBarQuestion(id, hardMode = false) {
    return hardMode ? createHistoricalBarQuestion(id) : createStandardBarQuestion(id)
}

function createFallbackQuestions(targetCount = QUESTION_COUNT) {
    const questions = []

    for (let id = 1; id <= targetCount; id += 1) {
        if (id % 3 === 1) {
            questions.push(createTableQuestion(id, id % 6 === 1))
        } else if (id % 3 === 2) {
            questions.push(createPieQuestion(id, id % 6 === 2))
        } else {
            questions.push(createBarQuestion(id, id % 6 === 0))
        }
    }

    return questions
}

function normalizeGoldQuestionIds(goldQuestions) {
    return goldQuestions.map((question, index) => {
        const normalized = {
            ...question,
            id: index + 1,
            subtype: 'interactive_numerical',
            difficulty: normalizeDifficulty(question?.difficulty, inferDifficulty(question, index)),
        }
        if (question?.id !== undefined) {
            normalized.source_id = question.id
        }
        return normalized
    })
}

function createHardFillQuestions(startId, count) {
    const fillQuestions = []
    for (let index = 0; index < count; index += 1) {
        const id = startId + index
        if (index % 3 === 0) {
            fillQuestions.push(createTableQuestion(id, true))
        } else if (index % 3 === 1) {
            fillQuestions.push(createPieQuestion(id, true))
        } else {
            fillQuestions.push(createBarQuestion(id, true))
        }
    }
    return fillQuestions
}

function main() {
    const goldQuestions = normalizeGoldQuestionIds(loadGoldStandardQuestions())
    let questions = []

    if (goldQuestions.length === 0) {
        questions = createFallbackQuestions(QUESTION_COUNT)
    } else {
        questions = [...goldQuestions]
        const remaining = Math.max(0, QUESTION_COUNT - questions.length)
        if (remaining > 0) {
            questions.push(...createHardFillQuestions(questions.length + 1, remaining))
        }
    }

    writeFileSync(OUTPUT_FILE, `${JSON.stringify(questions, null, 2)}\n`)
    console.log(`Generated ${questions.length} interactive numerical questions -> ${OUTPUT_FILE} (gold source: ${goldQuestions.length})`)
}

main()
