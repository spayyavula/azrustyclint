import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-full items-center justify-center bg-editor-bg p-8">
          <div className="text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="mb-2 text-lg font-medium">Something went wrong</h2>
            <p className="mb-4 text-sm text-gray-400">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-md bg-editor-accent px-4 py-2 text-sm hover:bg-blue-600"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
