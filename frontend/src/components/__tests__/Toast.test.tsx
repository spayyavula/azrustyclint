import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '../../test/utils'
import { ToastContainer, toast, useToastStore } from '../Toast'

describe('Toast', () => {
  beforeEach(() => {
    // Reset store between tests
    useToastStore.setState({ toasts: [] })
  })

  it('renders success toast', () => {
    render(<ToastContainer />)

    act(() => {
      toast.success('Success message')
    })

    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('renders error toast', () => {
    render(<ToastContainer />)

    act(() => {
      toast.error('Error message')
    })

    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('renders info toast', () => {
    render(<ToastContainer />)

    act(() => {
      toast.info('Info message')
    })

    expect(screen.getByText('Info message')).toBeInTheDocument()
  })

  it('removes toast when close button clicked', async () => {
    const { user } = await import('@testing-library/user-event')
    render(<ToastContainer />)

    act(() => {
      toast.success('Closeable toast')
    })

    expect(screen.getByText('Closeable toast')).toBeInTheDocument()

    const closeButton = screen.getByRole('button')
    await user.default.click(closeButton)

    expect(screen.queryByText('Closeable toast')).not.toBeInTheDocument()
  })

  it('auto-removes toast after duration', async () => {
    vi.useFakeTimers()
    render(<ToastContainer />)

    act(() => {
      toast.success('Auto-remove toast')
    })

    expect(screen.getByText('Auto-remove toast')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Auto-remove toast')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('renders multiple toasts', () => {
    render(<ToastContainer />)

    act(() => {
      toast.success('First toast')
      toast.error('Second toast')
      toast.info('Third toast')
    })

    expect(screen.getByText('First toast')).toBeInTheDocument()
    expect(screen.getByText('Second toast')).toBeInTheDocument()
    expect(screen.getByText('Third toast')).toBeInTheDocument()
  })
})
