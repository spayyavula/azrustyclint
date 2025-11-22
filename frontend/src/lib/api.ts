import axios from 'axios'
import type { User, Project, File, ExecutionResult, Language } from '../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export async function register(email: string, username: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>('/auth/register', {
    email,
    username,
    password,
  })
  return data
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
    email,
    password,
  })
  return data
}

export async function getMe() {
  const { data } = await api.get<User>('/auth/me')
  return data
}

// Projects
export async function listProjects() {
  const { data } = await api.get<Project[]>('/projects')
  return data
}

export async function createProject(name: string, default_language: Language) {
  const { data } = await api.post<Project>('/projects', { name, default_language })
  return data
}

export async function getProject(id: string) {
  const { data } = await api.get<Project>(`/projects/${id}`)
  return data
}

export async function updateProject(id: string, updates: { name?: string; default_language?: Language }) {
  const { data } = await api.put<Project>(`/projects/${id}`, updates)
  return data
}

export async function deleteProject(id: string) {
  await api.delete(`/projects/${id}`)
}

// Files
export async function listFiles(projectId: string) {
  const { data } = await api.get<File[]>(`/projects/${projectId}/files`)
  return data
}

export async function createFile(
  project_id: string,
  path: string,
  language: Language,
  content: string
) {
  const { data } = await api.post<File>('/files', {
    project_id,
    path,
    language,
    content,
  })
  return data
}

export async function getFile(id: string) {
  const { data } = await api.get<File>(`/files/${id}`)
  return data
}

export async function updateFile(id: string, content: string) {
  const { data } = await api.put<File>(`/files/${id}`, { content })
  return data
}

export async function deleteFile(id: string) {
  await api.delete(`/files/${id}`)
}

// Sandbox
export async function runCode(code: string, language: Language, stdin?: string) {
  const { data } = await api.post<ExecutionResult>('/sandbox/run', {
    code,
    language,
    stdin,
  })
  return data
}

export default api
