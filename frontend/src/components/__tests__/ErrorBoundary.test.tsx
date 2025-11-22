import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
  })

  it('resets error state when try again is clicked', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click try again
    await user.click(screen.getByText('Try again'))

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })
})
