import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listProjects, createProject, deleteProject } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Code2, Plus, Folder, Trash2, LogOut, Clock } from 'lucide-react'
import { LANGUAGE_NAMES } from '../types'
import type { Language } from '../types'

export default function Dashboard() {
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectLang, setNewProjectLang] = useState<Language>('python')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const createMutation = useMutation({
    mutationFn: () => createProject(newProjectName, newProjectLang),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowNewProject(false)
      setNewProjectName('')
      navigate(`/project/${project.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen flex-col bg-editor-bg">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-editor-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Code2 size={24} className="text-editor-accent" />
          <h1 className="text-xl font-bold">RustyClint</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium">Your Projects</h2>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 rounded-md bg-editor-accent px-4 py-2 text-sm font-medium hover:bg-blue-600"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>

          {/* New Project Form */}
          {showNewProject && (
            <div className="mb-6 rounded-lg border border-editor-border bg-editor-sidebar p-4">
              <form onSubmit={handleCreateProject} className="flex gap-4">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  required
                  className="flex-1 rounded-md border border-editor-border bg-editor-bg px-3 py-2 text-sm focus:border-editor-accent focus:outline-none"
                />
                <select
                  value={newProjectLang}
                  onChange={(e) => setNewProjectLang(e.target.value as Language)}
                  className="rounded-md border border-editor-border bg-editor-bg px-3 py-2 text-sm focus:border-editor-accent focus:outline-none"
                >
                  {Object.entries(LANGUAGE_NAMES).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-editor-accent px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="rounded-md px-4 py-2 text-sm hover:bg-editor-active"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Projects List */}
          {isLoading ? (
            <div className="text-center text-gray-400">Loading projects...</div>
          ) : projects?.length === 0 ? (
            <div className="text-center text-gray-400">
              <Folder size={48} className="mx-auto mb-4 opacity-50" />
              <p>No projects yet</p>
              <p className="text-sm">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects?.map((project) => (
                <div
                  key={project.id}
                  className="group cursor-pointer rounded-lg border border-editor-border bg-editor-sidebar p-4 transition-colors hover:border-editor-accent"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Folder size={20} className="text-editor-accent" />
                      <h3 className="font-medium">{project.name}</h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this project?')) {
                          deleteMutation.mutate(project.id)
                        }
                      }}
                      className="rounded p-1 opacity-0 hover:bg-red-500/20 group-hover:opacity-100"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{LANGUAGE_NAMES[project.default_language]}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
