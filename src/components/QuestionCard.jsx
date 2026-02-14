import { Flag, CheckCircle2, XCircle } from 'lucide-react'
import SHLDragTableWidget from './interactive/SHLDragTableWidget'
import SHLResizablePieWidget from './interactive/SHLResizablePieWidget'
import SHLAdjustableBarWidget from './interactive/SHLAdjustableBarWidget'
import SHLTabbedEvalWidget from './interactive/SHLTabbedEvalWidget'
import SHLPointGraphWidget from './interactive/SHLPointGraphWidget'
import { evaluateQuestionAnswer, hasAnsweredValue, isInteractiveQuestionType } from '../utils/questionScoring'

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i
const MARKDOWN_TABLE_DIVIDER_RE = /^:?-{3,}:?$/

function looksLikeHtml(value) {
    return HTML_TAG_RE.test(String(value || ''))
}

function isBulletLine(line) {
    const trimmed = String(line || '').trimStart()
    return (
        trimmed.startsWith('•') ||
        trimmed.startsWith('â€¢') ||
        trimmed.startsWith('- ') ||
        trimmed.startsWith('* ')
    )
}

function stripBullet(line) {
    const trimmed = String(line || '').trimStart()

    if (trimmed.startsWith('â€¢')) return trimmed.slice(3).trimStart()
    if (trimmed.startsWith('•')) return trimmed.slice(1).trimStart()
    if (trimmed.startsWith('- ')) return trimmed.slice(2)
    if (trimmed.startsWith('* ')) return trimmed.slice(2)
    return trimmed
}

function parseInlineMarkdownTableLine(line) {
    const input = String(line || '').trim()
    if (!input.includes('|')) return null
    if (!input.includes(':---') && !input.includes('---')) return null

    const firstPipe = input.indexOf('|')
    if (firstPipe === -1) return null

    const title = input.slice(0, firstPipe).trim()
    const tablePart = input.slice(firstPipe)

    let tokens = tablePart.split('|').map((token) => token.trim())
    if (tokens[0] === '') tokens = tokens.slice(1)
    if (tokens[tokens.length - 1] === '') tokens = tokens.slice(0, -1)

    const dividerIndex = tokens.findIndex((token) => MARKDOWN_TABLE_DIVIDER_RE.test(token))
    if (dividerIndex <= 0) return null

    let columnCount = 0
    for (let index = dividerIndex; index < tokens.length; index += 1) {
        if (!MARKDOWN_TABLE_DIVIDER_RE.test(tokens[index])) break
        columnCount += 1
    }
    if (columnCount < 2) return null

    const header = []
    for (let index = 0; index < dividerIndex && header.length < columnCount; index += 1) {
        header.push(tokens[index])
    }
    if (header.length !== columnCount) return null

    const rows = []
    const bodyStart = dividerIndex + columnCount
    let currentRow = []
    for (let index = bodyStart; index < tokens.length; index += 1) {
        const token = tokens[index]
        if (token === '' && currentRow.length === 0) continue

        currentRow.push(token)
        if (currentRow.length === columnCount) {
            rows.push(currentRow)
            currentRow = []
        }
    }

    if (rows.length === 0) return null

    const normalizedHeader = header.map((cell, index) => (cell || (index === 0 ? 'Term' : '')))

    return {
        title: title.endsWith(':') ? title.slice(0, -1) : title,
        header: normalizedHeader,
        rows,
    }
}

function parseClientPriorityTable(lines, startIndex) {
    const heading = String(lines[startIndex] || '').trim()
    if (!heading.toLowerCase().startsWith('client response priority table')) return null

    const rows = []
    let index = startIndex + 1

    while (index < lines.length) {
        const line = String(lines[index] || '').trim()
        if (!line) break

        const match = line.match(/^Yearly Revenue:\s*(.*?),\s*Contract\s*(.*?)\s*(?:→|->)\s*Priority\s*(\d+)\s*$/i)
        if (!match) break

        rows.push([match[1].trim(), match[2].trim(), match[3].trim()])
        index += 1
    }

    if (rows.length === 0) return null

    return {
        title: heading.endsWith(':') ? heading.slice(0, -1) : heading,
        header: ['Yearly Revenue', 'Contract Length', 'Priority'],
        rows,
        nextIndex: index,
    }
}

function parseDashSeparatedTable(lines, startIndex) {
    const headerLine = String(lines[startIndex] || '').trim()
    if (!headerLine.includes(' - ')) return null

    const header = headerLine.split(/\s*-\s*/).map((cell) => cell.trim()).filter(Boolean)
    if (header.length < 2) return null

    const rows = []
    let index = startIndex + 1

    while (index < lines.length) {
        const line = String(lines[index] || '').trim()
        if (!line) break
        if (!line.includes(' - ')) break

        const row = line.split(/\s*-\s*/).map((cell) => cell.trim())
        if (row.length !== header.length) break

        rows.push(row)
        index += 1
    }

    if (rows.length < 2) return null

    return {
        header,
        rows,
        nextIndex: index,
    }
}

function parsePipeKeyValueTable(lines, startIndex) {
    const rows = []
    let index = startIndex

    while (index < lines.length) {
        const line = String(lines[index] || '').trim()
        if (!line) break
        if (!line.includes('|')) break

        const segments = line
            .split('|')
            .map((segment) => segment.trim())
            .filter(Boolean)

        const keyValueSegments = segments.filter((segment) => segment.includes(':') || segment.includes('='))
        if (keyValueSegments.length < 2) break

        for (const segment of keyValueSegments) {
            if (segment.includes('=')) {
                const [left, ...rightParts] = segment.split('=')
                const right = rightParts.join('=')
                if (left && right) rows.push([left.trim(), right.trim()])
                continue
            }

            const [left, ...rightParts] = segment.split(':')
            const right = rightParts.join(':')
            if (left && right) rows.push([left.trim(), right.trim()])
        }

        index += 1
    }

    if (rows.length === 0) return null

    return {
        header: ['Item', 'Value'],
        rows,
        nextIndex: index,
    }
}

function renderPlainTextContext(context, questionText) {
    const normalizedQuestion = String(questionText || '').trim()
    const lines = String(context || '').replace(/\r\n/g, '\n').split('\n')

    while (normalizedQuestion && lines.length > 0 && String(lines[lines.length - 1]).trim() === normalizedQuestion) {
        lines.pop()
    }

    const blocks = []
    let paragraphLines = []
    let bulletLines = []

    function flushParagraph() {
        if (paragraphLines.length === 0) return
        blocks.push({ type: 'paragraph', lines: paragraphLines })
        paragraphLines = []
    }

    function flushBullets() {
        if (bulletLines.length === 0) return
        blocks.push({ type: 'bullets', items: bulletLines })
        bulletLines = []
    }

    for (let index = 0; index < lines.length;) {
        const raw = String(lines[index] || '')
        const trimmed = raw.trim()

        if (!trimmed) {
            flushParagraph()
            flushBullets()
            index += 1
            continue
        }

        const clientPriority = parseClientPriorityTable(lines, index)
        if (clientPriority) {
            flushParagraph()
            flushBullets()
            blocks.push({ type: 'table', title: clientPriority.title, header: clientPriority.header, rows: clientPriority.rows })
            index = clientPriority.nextIndex
            continue
        }

        const inlineMarkdownTable = parseInlineMarkdownTableLine(trimmed)
        if (inlineMarkdownTable) {
            flushParagraph()
            flushBullets()
            blocks.push({ type: 'table', title: inlineMarkdownTable.title, header: inlineMarkdownTable.header, rows: inlineMarkdownTable.rows })
            index += 1
            continue
        }

        if (trimmed.endsWith(':')) {
            const dashedTable = parseDashSeparatedTable(lines, index + 1)
            if (dashedTable) {
                flushParagraph()
                flushBullets()
                blocks.push({ type: 'table', title: trimmed.slice(0, -1), header: dashedTable.header, rows: dashedTable.rows })
                index = dashedTable.nextIndex
                continue
            }

            const pipeKeyValue = parsePipeKeyValueTable(lines, index + 1)
            if (pipeKeyValue) {
                flushParagraph()
                flushBullets()
                blocks.push({ type: 'table', title: trimmed.slice(0, -1), header: pipeKeyValue.header, rows: pipeKeyValue.rows })
                index = pipeKeyValue.nextIndex
                continue
            }
        }

        const dashedTable = parseDashSeparatedTable(lines, index)
        if (dashedTable) {
            flushParagraph()
            flushBullets()
            blocks.push({ type: 'table', title: null, header: dashedTable.header, rows: dashedTable.rows })
            index = dashedTable.nextIndex
            continue
        }

        const pipeKeyValue = parsePipeKeyValueTable(lines, index)
        if (pipeKeyValue) {
            flushParagraph()
            flushBullets()
            blocks.push({ type: 'table', title: null, header: pipeKeyValue.header, rows: pipeKeyValue.rows })
            index = pipeKeyValue.nextIndex
            continue
        }

        if (isBulletLine(raw)) {
            flushParagraph()
            bulletLines.push(stripBullet(raw))
            index += 1
            continue
        }

        flushBullets()
        paragraphLines.push(trimmed)
        index += 1
    }

    flushParagraph()
    flushBullets()

    return (
        <div className="question-card__context-text">
            {blocks.map((block, blockIndex) => {
                if (block.type === 'table') {
                    return (
                        <div key={`ctx-table-${blockIndex}`} className="question-card__context-block">
                            {block.title ? <p className="question-card__context-title">{block.title}</p> : null}
                            <table className="q-table">
                                <thead>
                                    <tr>
                                        {block.header.map((cell, cellIndex) => (
                                            <th key={`ctx-th-${blockIndex}-${cellIndex}`}>{cell}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {block.rows.map((row, rowIndex) => (
                                        <tr key={`ctx-tr-${blockIndex}-${rowIndex}`}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={`ctx-td-${blockIndex}-${rowIndex}-${cellIndex}`}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }

                if (block.type === 'bullets') {
                    return (
                        <ul key={`ctx-bullets-${blockIndex}`} className="question-card__context-list">
                            {block.items.map((item, itemIndex) => (
                                <li key={`ctx-li-${blockIndex}-${itemIndex}`}>{item}</li>
                            ))}
                        </ul>
                    )
                }

                return (
                    <div key={`ctx-paragraph-${blockIndex}`} className="question-card__context-block">
                        {block.lines.map((line, lineIndex) => (
                            <p key={`ctx-line-${blockIndex}-${lineIndex}`} className="question-card__context-line">
                                {line}
                            </p>
                        ))}
                    </div>
                )
            })}
        </div>
    )
}

export default function QuestionCard({
    question,
    questionNumber,
    totalQuestions,
    selectedAnswer,
    onSelectAnswer,
    showResult = false,
    correctAnswer,
    isFlagged = false,
    onToggleFlag,
}) {
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F']
    const isInteractive = isInteractiveQuestionType(question?.type)
    const hasInteractionAnswer = hasAnsweredValue(selectedAnswer, question)
    const interactiveResult = isInteractive && hasInteractionAnswer
        ? evaluateQuestionAnswer(question, selectedAnswer)
        : null

    function getOptionClass(index) {
        let cls = 'question-option'

        if (showResult) {
            if (index === correctAnswer) return `${cls} question-option--correct`
            if (selectedAnswer === index && index !== correctAnswer) return `${cls} question-option--incorrect`
            return `${cls} question-option--dim`
        }

        if (selectedAnswer === index) return `${cls} question-option--selected`
        return cls
    }

    function renderInteractiveWidget() {
        const widgetKey = `interactive-${question?.id ?? questionNumber}`

        switch (question.type) {
            case 'interactive_drag_table':
                return (
                    <SHLDragTableWidget
                        key={widgetKey}
                        data={question.widget_data}
                        value={selectedAnswer}
                        onAnswer={onSelectAnswer}
                    />
                )
            case 'interactive_pie_chart':
                return (
                    <SHLResizablePieWidget
                        key={widgetKey}
                        data={question.widget_data}
                        value={selectedAnswer}
                        onAnswer={onSelectAnswer}
                    />
                )
            case 'interactive_stacked_bar':
                return (
                    <SHLAdjustableBarWidget
                        key={widgetKey}
                        data={question.widget_data}
                        value={selectedAnswer}
                        onAnswer={onSelectAnswer}
                    />
                )
            case 'interactive_tabbed_evaluation':
                return (
                    <SHLTabbedEvalWidget
                        key={widgetKey}
                        data={question.widget_data}
                        value={selectedAnswer}
                        onAnswer={onSelectAnswer}
                    />
                )
            case 'interactive_point_graph':
                return (
                    <SHLPointGraphWidget
                        key={widgetKey}
                        data={question.widget_data}
                        value={selectedAnswer}
                        onAnswer={onSelectAnswer}
                    />
                )
            default:
                return null
        }
    }

    return (
        <article className="question-card">
            <header className="question-card__header">
                <div className="question-card__counter">
                    <span className="question-card__badge">Question {questionNumber}</span>
                    <span className="question-card__total">of {totalQuestions}</span>
                </div>

                {onToggleFlag && (
                    <button
                        type="button"
                        className={`question-card__flag ${isFlagged ? 'question-card__flag--active' : ''}`}
                        onClick={onToggleFlag}
                        aria-label={isFlagged ? 'Unflag question' : 'Flag question'}
                    >
                        <Flag size={14} />
                        {isFlagged ? 'Flagged' : 'Flag'}
                    </button>
                )}
            </header>

            <div className="question-card__body">
                {question.section && (
                    <p className="question-card__section">
                        {question.section}
                    </p>
                )}

                {question.context && (
                    looksLikeHtml(question.context) ? (
                        <div
                            className="question-card__context"
                            dangerouslySetInnerHTML={{ __html: question.context }}
                        />
                    ) : (
                        <div className="question-card__context">
                            {renderPlainTextContext(question.context, question.question)}
                        </div>
                    )
                )}

                {question.instruction && (
                    <p className="question-card__instruction">{question.instruction}</p>
                )}

                <h3 className="question-card__question">
                    {question.question}
                </h3>

                {Array.isArray(question.prompt_rules) && question.prompt_rules.length > 0 && (
                    <ul className="question-card__rules">
                        {question.prompt_rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                        ))}
                    </ul>
                )}

                {isInteractive ? (
                    <>
                        <div className="question-card__interactive">
                            {renderInteractiveWidget()}
                        </div>

                        {showResult && hasInteractionAnswer && (
                            <div className={`question-card__interactive-result ${interactiveResult ? 'question-card__interactive-result--correct' : 'question-card__interactive-result--incorrect'}`}>
                                {interactiveResult ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Your current interactive answer is correct.
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={16} />
                                        Your current interactive answer is not correct yet.
                                    </>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="question-card__options">
                        {(question.options || []).map((option, index) => {
                            const isCurrentCorrect = showResult && index === correctAnswer
                            const isCurrentWrong = showResult && selectedAnswer === index && index !== correctAnswer
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    className={getOptionClass(index)}
                                    onClick={() => !showResult && onSelectAnswer(index)}
                                    disabled={showResult}
                                    aria-pressed={selectedAnswer === index}
                                >
                                    <span className="question-option__label">{optionLetters[index]}</span>
                                    <span className="question-option__text">{option}</span>
                                    {isCurrentCorrect && <CheckCircle2 size={18} className="question-option__icon question-option__icon--correct" />}
                                    {isCurrentWrong && <XCircle size={18} className="question-option__icon question-option__icon--wrong" />}
                                </button>
                            )
                        })}
                    </div>
                )}

                {showResult && question.explanation && (
                    <section className="question-card__explanation">
                        <h4>
                            <CheckCircle2 size={16} />
                            Explanation
                        </h4>
                        <div dangerouslySetInnerHTML={{ __html: question.explanation }} />
                    </section>
                )}
            </div>
        </article>
    )
}
