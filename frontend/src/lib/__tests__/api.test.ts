import { describe, it, expect, beforeEach } from 'vitest'
import { login, register, listProjects, createProject, runCode } from '../api'

describe('API client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('auth', () => {
    it('login returns token and user', async () => {
      const result = await login('test@example.com', 'password123')

      expect(result.token).toBe('mock-token')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.username).toBe('testuser')
    })

    it('login fails with invalid credentials', async () => {
      await expect(login('test@example.com', 'wrong')).rejects.toThrow()
    })

    it('register returns token and user', async () => {
      const result = await register('new@example.com', 'newuser', 'password123')

      expect(result.token).toBe('mock-token')
      expect(result.user.email).toBe('new@example.com')
      expect(result.user.username).toBe('newuser')
    })
  })

  describe('projects', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'mock-token')
    })

    it('lists projects', async () => {
      const projects = await listProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0].name).toBe('Test Project')
    })

    it('creates project', async () => {
      const project = await createProject('New Project', 'rust')

      expect(project.name).toBe('New Project')
      expect(project.default_language).toBe('rust')
    })
  })

  describe('sandbox', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'mock-token')
    })

    it('runs code and returns result', async () => {
      const result = await runCode('print("Hello")', 'python')

      expect(result.stdout).toBe('Hello, World!\n')
      expect(result.exit_code).toBe(0)
      expect(result.timed_out).toBe(false)
    })
  })
})
