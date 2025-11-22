import { create } from 'zustand'
import type { Project, File, Collaborator, ExecutionResult } from '../types'

interface EditorState {
  // Current project and file
  project: Project | null
  files: File[]
  activeFile: File | null

  // Collaboration
  collaborators: Collaborator[]

  // Execution
  isRunning: boolean
  executionResult: ExecutionResult | null

  // UI state
  sidebarOpen: boolean
  outputOpen: boolean

  // Actions
  setProject: (project: Project) => void
  setFiles: (files: File[]) => void
  setActiveFile: (file: File | null) => void
  updateFileContent: (fileId: string, content: string) => void

  setCollaborators: (collaborators: Collaborator[]) => void
  addCollaborator: (collaborator: Collaborator) => void
  removeCollaborator: (userId: string) => void
  updateCollaboratorCursor: (userId: string, cursor: { line: number; column: number }) => void

  setIsRunning: (running: boolean) => void
  setExecutionResult: (result: ExecutionResult | null) => void

  toggleSidebar: () => void
  toggleOutput: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  project: null,
  files: [],
  activeFile: null,
  collaborators: [],
  isRunning: false,
  executionResult: null,
  sidebarOpen: true,
  outputOpen: false,

  setProject: (project) => set({ project }),
  setFiles: (files) => set({ files }),
  setActiveFile: (file) => set({ activeFile: file }),
  updateFileContent: (fileId, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, content } : f
      ),
      activeFile:
        state.activeFile?.id === fileId
          ? { ...state.activeFile, content }
          : state.activeFile,
    })),

  setCollaborators: (collaborators) => set({ collaborators }),
  addCollaborator: (collaborator) =>
    set((state) => ({
      collaborators: [...state.collaborators, collaborator],
    })),
  removeCollaborator: (userId) =>
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.user_id !== userId),
    })),
  updateCollaboratorCursor: (userId, cursor) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.user_id === userId ? { ...c, cursor } : c
      ),
    })),

  setIsRunning: (isRunning) => set({ isRunning }),
  setExecutionResult: (executionResult) => set({ executionResult, outputOpen: !!executionResult }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleOutput: () => set((state) => ({ outputOpen: !state.outputOpen })),
}))
