import { useEffect } from 'react'

type KeyHandler = (e: KeyboardEvent) => void

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: KeyHandler
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault()
          shortcut.handler(e)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// Common shortcuts for the editor
export function useEditorShortcuts({
  onSave,
  onRun,
  onToggleSidebar,
  onToggleOutput,
  onNewFile,
}: {
  onSave?: () => void
  onRun?: () => void
  onToggleSidebar?: () => void
  onToggleOutput?: () => void
  onNewFile?: () => void
}) {
  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      handler: () => onSave?.(),
      description: 'Save file',
    },
    {
      key: 'Enter',
      ctrl: true,
      handler: () => onRun?.(),
      description: 'Run code',
    },
    {
      key: 'b',
      ctrl: true,
      handler: () => onToggleSidebar?.(),
      description: 'Toggle sidebar',
    },
    {
      key: 'j',
      ctrl: true,
      handler: () => onToggleOutput?.(),
      description: 'Toggle output panel',
    },
    {
      key: 'n',
      ctrl: true,
      handler: () => onNewFile?.(),
      description: 'New file',
    },
  ])
}

// Keyboard shortcuts help modal content
export const SHORTCUTS_LIST = [
  { keys: 'Ctrl+S', description: 'Save file' },
  { keys: 'Ctrl+Enter', description: 'Run code' },
  { keys: 'Ctrl+B', description: 'Toggle sidebar' },
  { keys: 'Ctrl+J', description: 'Toggle output' },
  { keys: 'Ctrl+N', description: 'New file' },
  { keys: 'Ctrl+P', description: 'Quick open file' },
  { keys: 'Ctrl+Shift+P', description: 'Command palette' },
  { keys: 'Ctrl+/', description: 'Toggle comment' },
  { keys: 'Ctrl+D', description: 'Select next occurrence' },
  { keys: 'Alt+Up/Down', description: 'Move line up/down' },
]
