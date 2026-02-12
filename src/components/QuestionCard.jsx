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
    const optionLetters = ['A', 'B', 'C', 'D']

    function getOptionClass(index) {
        let cls = 'question-card__option'
        if (selectedAnswer === index) cls += ' question-card__option--selected'
        if (showResult && index === correctAnswer) cls += ' question-card__option--correct'
        if (showResult && selectedAnswer === index && index !== correctAnswer) cls += ' question-card__option--incorrect'
        return cls
    }

    return (
        <div className="question-card">
            <div className="question-card__header">
                <span className="question-card__number">
                    Question {questionNumber} of {totalQuestions}
                </span>
                <button
                    className={`question-card__flag ${isFlagged ? 'question-card__flag--active' : ''}`}
                    onClick={onToggleFlag}
                    title={isFlagged ? 'Unflag question' : 'Flag for review'}
                >
                    {isFlagged ? '🚩' : '⚑'}
                </button>
            </div>

            {question.section && (
                <div className="question-card__section">{question.section}</div>
            )}

            <div className="question-card__text">
                {question.question}
            </div>

            {question.context && (
                <div className="question-card__context">
                    {question.context}
                </div>
            )}

            <div className="question-card__options">
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        className={getOptionClass(index)}
                        onClick={() => !showResult && onSelectAnswer(index)}
                        disabled={showResult}
                    >
                        <span className="question-card__option-letter">
                            {optionLetters[index]}
                        </span>
                        <span className="question-card__option-text">
                            {option}
                        </span>
                        {showResult && index === correctAnswer && (
                            <span className="question-card__option-icon">✓</span>
                        )}
                        {showResult && selectedAnswer === index && index !== correctAnswer && (
                            <span className="question-card__option-icon">✗</span>
                        )}
                    </button>
                ))}
            </div>

            {showResult && question.explanation && (
                <div className="question-card__explanation">
                    <strong>Explanation:</strong> {question.explanation}
                </div>
            )}
        </div>
    )
}
