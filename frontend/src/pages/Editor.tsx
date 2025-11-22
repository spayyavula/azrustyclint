import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProject,
  listFiles,
  getFile,
  createFile,
  updateFile,
  runCode,
} from '../lib/api'
import { useEditorStore } from '../stores/editor'
import CodeEditor from '../components/CodeEditor'
import OutputPanel from '../components/OutputPanel'
import Collaborators from '../components/Collaborators'
import {
  Code2,
  Play,
  Save,
  FolderTree,
  File as FileIcon,
  Plus,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  Terminal,
} from 'lucide-react'
import { LANGUAGE_NAMES, LANGUAGE_EXTENSIONS } from '../types'
import type { Language } from '../types'
import clsx from 'clsx'

export default function Editor() {
  const { projectId, fileId } = useParams<{ projectId: string; fileId?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    project,
    files,
    activeFile,
    sidebarOpen,
    setProject,
    setFiles,
    setActiveFile,
    updateFileContent,
    toggleSidebar,
    setIsRunning,
    setExecutionResult,
    toggleOutput,
  } = useEditorStore()

  const [showNewFile, setShowNewFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileLang, setNewFileLang] = useState<Language>('python')

  // Load project
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  })

  // Load files
  const { data: filesData } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => listFiles(projectId!),
    enabled: !!projectId,
  })

  // Load active file content
  const { data: fileData } = useQuery({
    queryKey: ['file', fileId],
    queryFn: () => getFile(fileId!),
    enabled: !!fileId,
  })

  // Update store when data loads
  useEffect(() => {
    if (projectData) {
      setProject(projectData)
      setNewFileLang(projectData.default_language)
    }
  }, [projectData, setProject])

  useEffect(() => {
    if (filesData) {
      setFiles(filesData)
    }
  }, [filesData, setFiles])

  useEffect(() => {
    if (fileData) {
      setActiveFile(fileData)
    }
  }, [fileData, setActiveFile])

  // Create file mutation
  const createFileMutation = useMutation({
    mutationFn: () =>
      createFile(
        projectId!,
        `${newFileName}.${LANGUAGE_EXTENSIONS[newFileLang]}`,
        newFileLang,
        ''
      ),
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] })
      setShowNewFile(false)
      setNewFileName('')
      navigate(`/project/${projectId}/file/${file.id}`)
    },
  })

  // Save file mutation
  const saveFileMutation = useMutation({
    mutationFn: (content: string) => updateFile(activeFile!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file', fileId] })
    },
  })

  // Run code mutation
  const runCodeMutation = useMutation({
    mutationFn: () =>
      runCode(activeFile!.content || '', activeFile!.language),
    onMutate: () => {
      setIsRunning(true)
    },
    onSuccess: (result) => {
      setExecutionResult(result)
    },
    onSettled: () => {
      setIsRunning(false)
    },
  })

  const handleSave = () => {
    if (activeFile?.content) {
      saveFileMutation.mutate(activeFile.content)
    }
  }

  const handleRun = () => {
    if (activeFile) {
      runCodeMutation.mutate()
    }
  }

  const handleContentChange = (content: string) => {
    if (activeFile) {
      updateFileContent(activeFile.id, content)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-editor-bg">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-editor-border px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Code2 size={20} className="text-editor-accent" />
            <span className="font-medium">{project?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Collaborators />

          <button
            onClick={handleSave}
            disabled={!activeFile || saveFileMutation.isPending}
            className="flex items-center gap-1 rounded px-3 py-1 text-sm hover:bg-editor-active disabled:opacity-50"
            title="Save (Ctrl+S)"
          >
            <Save size={16} />
            Save
          </button>

          <button
            onClick={handleRun}
            disabled={!activeFile || runCodeMutation.isPending}
            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-700 disabled:opacity-50"
            title="Run (Ctrl+Enter)"
          >
            <Play size={16} />
            Run
          </button>

          <button
            onClick={toggleOutput}
            className="flex items-center gap-1 rounded px-3 py-1 text-sm hover:bg-editor-active"
            title="Toggle Output"
          >
            <Terminal size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="flex w-64 flex-col border-r border-editor-border bg-editor-sidebar">
            <div className="flex items-center justify-between border-b border-editor-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderTree size={16} />
                Files
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowNewFile(true)}
                  className="rounded p-1 hover:bg-editor-active"
                  title="New File"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={toggleSidebar}
                  className="rounded p-1 hover:bg-editor-active"
                  title="Hide Sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>

            {/* New file form */}
            {showNewFile && (
              <div className="border-b border-editor-border p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    createFileMutation.mutate()
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="filename"
                    required
                    className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm focus:border-editor-accent focus:outline-none"
                    autoFocus
                  />
                  <select
                    value={newFileLang}
                    onChange={(e) => setNewFileLang(e.target.value as Language)}
                    className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm focus:border-editor-accent focus:outline-none"
                  >
                    {Object.entries(LANGUAGE_NAMES).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 rounded bg-editor-accent px-2 py-1 text-xs hover:bg-blue-600"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewFile(false)}
                      className="flex-1 rounded px-2 py-1 text-xs hover:bg-editor-active"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* File list */}
            <div className="flex-1 overflow-auto">
              {files.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No files yet
                </div>
              ) : (
                <ul className="py-1">
                  {files.map((file) => (
                    <li key={file.id}>
                      <button
                        onClick={() =>
                          navigate(`/project/${projectId}/file/${file.id}`)
                        }
                        className={clsx(
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-editor-active',
                          file.id === fileId && 'bg-editor-active'
                        )}
                      >
                        <FileIcon size={14} className="text-gray-400" />
                        <span className="truncate">{file.path}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

        {/* Toggle sidebar button when hidden */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="border-r border-editor-border p-2 hover:bg-editor-sidebar"
            title="Show Sidebar"
          >
            <PanelLeft size={16} />
          </button>
        )}

        {/* Editor area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeFile ? (
            <>
              {/* Tab bar */}
              <div className="flex items-center border-b border-editor-border bg-editor-sidebar">
                <div className="flex items-center gap-2 px-4 py-2 text-sm">
                  <FileIcon size={14} />
                  {activeFile.path}
                  <span className="text-xs text-gray-500">
                    ({LANGUAGE_NAMES[activeFile.language]})
                  </span>
                </div>
              </div>

              {/* Code editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  fileId={activeFile.id}
                  language={activeFile.language}
                  initialContent={activeFile.content}
                  onChange={handleContentChange}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              <div className="text-center">
                <FileIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a file to edit</p>
                <p className="text-sm">or create a new one</p>
              </div>
            </div>
          )}

          {/* Output panel */}
          <OutputPanel />
        </main>
      </div>
    </div>
  )
}
