import { Flag, CheckCircle2, XCircle } from 'lucide-react'
import SHLDragTableWidget from './interactive/SHLDragTableWidget'
import SHLResizablePieWidget from './interactive/SHLResizablePieWidget'
import SHLAdjustableBarWidget from './interactive/SHLAdjustableBarWidget'
import SHLTabbedEvalWidget from './interactive/SHLTabbedEvalWidget'
import SHLPointGraphWidget from './interactive/SHLPointGraphWidget'
import { evaluateQuestionAnswer, hasAnsweredValue, isInteractiveQuestionType } from '../utils/questionScoring'

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
                    <div
                        className="question-card__context"
                        dangerouslySetInnerHTML={{ __html: question.context }}
                    />
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
