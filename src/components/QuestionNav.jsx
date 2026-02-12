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
                        className={getButtonClass(i)}
                        onClick={() => onNavigate(i)}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        </div>
    )
}
