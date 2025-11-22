import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import LoadingSpinner, { LoadingOverlay, LoadingButton } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.firstChild as HTMLElement
    expect(spinner).toHaveClass('h-8', 'w-8')
  })

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    const spinner = container.firstChild as HTMLElement
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    const spinner = container.firstChild as HTMLElement
    expect(spinner).toHaveClass('h-12', 'w-12')
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />)
    const spinner = container.firstChild as HTMLElement
    expect(spinner).toHaveClass('custom-class')
  })
})

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Please wait" />)
    expect(screen.getByText('Please wait')).toBeInTheDocument()
  })
})

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(<LoadingButton loading={false}>Click me</LoadingButton>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Click me')).not.toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <LoadingButton loading={false} disabled>
        Click me
      </LoadingButton>
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
