import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Code2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      navigate('/dashboard')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-editor-bg">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-editor-sidebar p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Code2 size={32} className="text-editor-accent" />
            <h1 className="text-2xl font-bold">RustyClint</h1>
          </div>
          <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-editor-border bg-editor-bg px-3 py-2 text-sm focus:border-editor-accent focus:outline-none focus:ring-1 focus:ring-editor-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-editor-border bg-editor-bg px-3 py-2 text-sm focus:border-editor-accent focus:outline-none focus:ring-1 focus:ring-editor-accent"
              placeholder="••••••••"
            />
          </div>

          {loginMutation.error && (
            <div className="text-sm text-red-500">
              {(loginMutation.error as any).response?.data?.error || 'Login failed'}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-md bg-editor-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-bg disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-editor-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
