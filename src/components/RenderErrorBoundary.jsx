import { Component } from 'react'

export default class RenderErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, message: '' }
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            message: error?.message || 'Unable to render this question.',
        }
    }

    componentDidCatch(error) {
        console.error('RenderErrorBoundary caught error:', error)
    }

    componentDidUpdate(prevProps) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false, message: '' })
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback({
                message: this.state.message,
            })
        }

        return this.props.children
    }
}
