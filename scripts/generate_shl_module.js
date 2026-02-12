import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUTPUT_FILE = resolve(ROOT, 'src/data/shl-interactive-questions.json')
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

function randomInt(min, max) {
    return Math.floor(random() * (max - min + 1)) + min
}

function toPct(part, total) {
    return Math.round((part / total) * 100)
}

function createTableQuestion(id) {
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
            instruction: 'Classify each row using the commission rule.',
            question: 'Drag the correct outcome label for each sales rep.',
            prompt_rules: [
                `Commission Score = (Sales - Returns x 5) / Net Sales`,
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

function createPieQuestion(id) {
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

    let remaining = 100
    const initialPct = {}
    segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
            initialPct[segment.id] = remaining
            return
        }
        const move = pick([-6, -4, -2, 2, 4, 6])
        const proposed = clamp(segment.correct_pct + move, 4, 92)
        initialPct[segment.id] = proposed
        remaining -= proposed
    })
    initialPct[segments[segments.length - 1].id] = remaining

    const ratioExpression = segments
        .map((segment, index) => `${segment.label}:${template[index]}`)
        .join(' | ')

    return {
        id,
        type: 'interactive_pie_chart',
        subtype: 'interactive_numerical',
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
        correct_answer: segments.reduce((accumulator, segment) => {
            accumulator[segment.id] = segment.correct_pct
            return accumulator
        }, {}),
        tolerance: {
            pct: 2,
        },
        explanation: 'Convert each ratio part into a percentage of the total ratio sum.',
    }
}

function createBarQuestion(id) {
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
        instruction: 'Adjust Month 2 total and Service/Product split.',
        question: 'Move the handles until Month 2 matches the growth rules.',
        prompt_rules: [
            `Month 1: ${monthOneTotal} total (${serviceBase} Service / ${productBase} Product)`,
            `Month 2: Service +${serviceGrowth}%, Product +${productGrowth}%`,
        ],
        widget_data: {
            axis_max: axisMax,
            bar_1: {
                total: monthOneTotal,
                split_pct: splitPct,
            },
            bar_2_initial: {
                total: clamp(monthOneTotal + pick([-20, -10, 10, 20]), 1, axisMax),
                split_pct: clamp(splitPct + pick([-12, -8, -4, 4, 8, 12]), 5, 95),
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

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function main() {
    const questions = []

    for (let id = 1; id <= QUESTION_COUNT; id += 1) {
        if (id % 3 === 1) {
            questions.push(createTableQuestion(id))
        } else if (id % 3 === 2) {
            questions.push(createPieQuestion(id))
        } else {
            questions.push(createBarQuestion(id))
        }
    }

    writeFileSync(OUTPUT_FILE, `${JSON.stringify(questions, null, 2)}\n`)
    console.log(`Generated ${questions.length} interactive numerical questions -> ${OUTPUT_FILE}`)
}

main()
