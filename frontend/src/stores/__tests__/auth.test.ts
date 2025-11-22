import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../auth'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      token: null,
      user: null,
    })
    localStorage.clear()
  })

  it('initial state is logged out', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('setAuth sets token and user', () => {
    const { setAuth } = useAuthStore.getState()

    setAuth('test-token', {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('test-token')
    expect(state.user).toEqual({
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
    })
  })

  it('setAuth stores token in localStorage', () => {
    const { setAuth } = useAuthStore.getState()

    setAuth('test-token', {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
    })

    expect(localStorage.getItem('token')).toBe('test-token')
  })

  it('logout clears state and localStorage', () => {
    const { setAuth, logout } = useAuthStore.getState()

    // First log in
    setAuth('test-token', {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
    })

    // Then log out
    logout()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
