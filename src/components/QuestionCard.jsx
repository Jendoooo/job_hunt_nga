import { Flag, CheckCircle2, XCircle } from 'lucide-react'

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

                <h3 className="question-card__question">
                    {question.question}
                </h3>

                <div className="question-card__options">
                    {question.options.map((option, index) => {
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
