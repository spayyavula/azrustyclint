import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../editor'

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useEditorStore.setState({
      project: null,
      files: [],
      activeFile: null,
      collaborators: [],
      isRunning: false,
      executionResult: null,
      sidebarOpen: true,
      outputOpen: false,
    })
  })

  describe('project management', () => {
    it('sets project', () => {
      const { setProject } = useEditorStore.getState()
      const project = {
        id: '123',
        name: 'Test Project',
        owner_id: '456',
        default_language: 'python' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      setProject(project)

      expect(useEditorStore.getState().project).toEqual(project)
    })
  })

  describe('file management', () => {
    it('sets files', () => {
      const { setFiles } = useEditorStore.getState()
      const files = [
        {
          id: '1',
          project_id: '123',
          path: 'main.py',
          language: 'python' as const,
        },
      ]

      setFiles(files)

      expect(useEditorStore.getState().files).toEqual(files)
    })

    it('sets active file', () => {
      const { setActiveFile } = useEditorStore.getState()
      const file = {
        id: '1',
        project_id: '123',
        path: 'main.py',
        language: 'python' as const,
        content: 'print("Hello")',
      }

      setActiveFile(file)

      expect(useEditorStore.getState().activeFile).toEqual(file)
    })

    it('updates file content', () => {
      const { setFiles, setActiveFile, updateFileContent } = useEditorStore.getState()
      const file = {
        id: '1',
        project_id: '123',
        path: 'main.py',
        language: 'python' as const,
        content: 'print("Hello")',
      }

      setFiles([file])
      setActiveFile(file)
      updateFileContent('1', 'print("Updated")')

      const state = useEditorStore.getState()
      expect(state.files[0].content).toBe('print("Updated")')
      expect(state.activeFile?.content).toBe('print("Updated")')
    })
  })

  describe('collaborators', () => {
    it('adds collaborator', () => {
      const { addCollaborator } = useEditorStore.getState()
      const collaborator = {
        user_id: '789',
        username: 'collab1',
        color: '#ff0000',
      }

      addCollaborator(collaborator)

      expect(useEditorStore.getState().collaborators).toContainEqual(collaborator)
    })

    it('removes collaborator', () => {
      const { setCollaborators, removeCollaborator } = useEditorStore.getState()
      setCollaborators([
        { user_id: '1', username: 'user1', color: '#ff0000' },
        { user_id: '2', username: 'user2', color: '#00ff00' },
      ])

      removeCollaborator('1')

      const state = useEditorStore.getState()
      expect(state.collaborators).toHaveLength(1)
      expect(state.collaborators[0].user_id).toBe('2')
    })

    it('updates collaborator cursor', () => {
      const { setCollaborators, updateCollaboratorCursor } = useEditorStore.getState()
      setCollaborators([
        { user_id: '1', username: 'user1', color: '#ff0000' },
      ])

      updateCollaboratorCursor('1', { line: 10, column: 5 })

      const state = useEditorStore.getState()
      expect(state.collaborators[0].cursor).toEqual({ line: 10, column: 5 })
    })
  })

  describe('execution', () => {
    it('sets running state', () => {
      const { setIsRunning } = useEditorStore.getState()

      setIsRunning(true)

      expect(useEditorStore.getState().isRunning).toBe(true)
    })

    it('sets execution result and opens output', () => {
      const { setExecutionResult } = useEditorStore.getState()
      const result = {
        stdout: 'Hello',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 42,
        timed_out: false,
      }

      setExecutionResult(result)

      const state = useEditorStore.getState()
      expect(state.executionResult).toEqual(result)
      expect(state.outputOpen).toBe(true)
    })
  })

  describe('UI state', () => {
    it('toggles sidebar', () => {
      const { toggleSidebar } = useEditorStore.getState()

      expect(useEditorStore.getState().sidebarOpen).toBe(true)
      toggleSidebar()
      expect(useEditorStore.getState().sidebarOpen).toBe(false)
      toggleSidebar()
      expect(useEditorStore.getState().sidebarOpen).toBe(true)
    })

    it('toggles output', () => {
      const { toggleOutput } = useEditorStore.getState()

      expect(useEditorStore.getState().outputOpen).toBe(false)
      toggleOutput()
      expect(useEditorStore.getState().outputOpen).toBe(true)
    })
  })
})
