export default function QuestionNav({
    totalQuestions,
    currentQuestion,
    answers,
    flagged = [],
    onNavigate
}) {
    function getButtonClass(index) {
        let cls = 'question-nav__btn'
        if (index === currentQuestion) cls += ' question-nav__btn--current'
        else if (answers[index] !== undefined && answers[index] !== null) cls += ' question-nav__btn--answered'
        if (flagged.includes(index)) cls += ' question-nav__btn--flagged'
        return cls
    }

    const answeredCount = Object.values(answers).filter(a => a !== undefined && a !== null).length
    const flaggedCount = flagged.length

    return (
        <div className="question-nav">
            <h3 className="question-nav__title">Question Navigator</h3>
            <div className="question-nav__stats">
                <div className="question-nav__stat">
                    <span className="question-nav__stat-dot question-nav__stat-dot--answered"></span>
                    Answered: {answeredCount}/{totalQuestions}
                </div>
                <div className="question-nav__stat">
                    <span className="question-nav__stat-dot question-nav__stat-dot--flagged"></span>
                    Flagged: {flaggedCount}
                </div>
                <div className="question-nav__stat">
                    <span className="question-nav__stat-dot question-nav__stat-dot--unanswered"></span>
                    Remaining: {totalQuestions - answeredCount}
                </div>
            </div>
            <div className="question-nav__grid">
                {Array.from({ length: totalQuestions }, (_, i) => (
                    <button
                        key={i}
                        type="button"
                        className={getButtonClass(i)}
                        onClick={() => onNavigate(i)}
                        aria-label={`Go to question ${i + 1}`}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        </div>
    )
}
