import { useEffect, useRef, useState } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { useEditorStore } from '../stores/editor'
import { useAuthStore } from '../stores/auth'
import { MONACO_LANGUAGES } from '../types'
import type { Language } from '../types'

interface CodeEditorProps {
  fileId: string
  language: Language
  initialContent?: string
  onChange?: (content: string) => void
}

export default function CodeEditor({
  fileId,
  language,
  initialContent = '',
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null)
  const [ydoc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [binding, setBinding] = useState<MonacoBinding | null>(null)
  const { user } = useAuthStore()
  const { setCollaborators, addCollaborator, removeCollaborator, updateCollaboratorCursor } =
    useEditorStore()

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Get the Y.Text type for the document content
    const ytext = ydoc.getText('content')

    // Set initial content if the document is empty
    if (ytext.length === 0 && initialContent) {
      ytext.insert(0, initialContent)
    }

    // Create WebSocket provider for collaboration
    const wsBaseUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    const wsProvider = new WebsocketProvider(
      `${wsBaseUrl}/collab`,
      fileId,
      ydoc
    )

    // Set user awareness info
    wsProvider.awareness.setLocalStateField('user', {
      name: user?.username || 'Anonymous',
      color: generateColor(user?.id || ''),
    })

    // Create Monaco binding
    const monacoBinding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      wsProvider.awareness
    )

    setProvider(wsProvider)
    setBinding(monacoBinding)

    // Handle awareness changes (collaborators joining/leaving)
    wsProvider.awareness.on('change', () => {
      const states = wsProvider.awareness.getStates()
      const collaborators: any[] = []

      states.forEach((state, clientId) => {
        if (clientId !== wsProvider.awareness.clientID && state.user) {
          collaborators.push({
            user_id: clientId.toString(),
            username: state.user.name,
            color: state.user.color,
            cursor: state.cursor,
          })
        }
      })

      setCollaborators(collaborators)
    })

    // Track cursor position for awareness
    editor.onDidChangeCursorPosition((e) => {
      wsProvider.awareness.setLocalStateField('cursor', {
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })

    // Handle content changes
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue()
      onChange?.(content)
    })

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      wordWrap: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      binding?.destroy()
      provider?.disconnect()
      ydoc.destroy()
    }
  }, [])

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={MONACO_LANGUAGES[language]}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          readOnly: false,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          wordWrap: 'on',
          automaticLayout: true,
        }}
        loading={
          <div className="flex h-full items-center justify-center text-editor-text">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}

// Generate a consistent color from user ID
function generateColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 60%)`
}
