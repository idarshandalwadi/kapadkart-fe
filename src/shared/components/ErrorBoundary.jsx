import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI exception captured by ErrorBoundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
              <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-display text-lg font-bold text-text">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-text-secondary">
              An unexpected error occurred while displaying this page. Your data is safe and has been saved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent/90"
              >
                <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = window.location.pathname.replace(/\/booking\/.*|\/sales\/.*/, '/dashboard')
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text transition hover:bg-surface-muted"
              >
                <i className="fa-solid fa-house" aria-hidden="true" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

