import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EditorTheme = 'vs-dark' | 'vs-light' | 'hc-black'

export interface EditorSettings {
  // Appearance
  theme: EditorTheme
  fontSize: number
  fontFamily: string
  lineHeight: number

  // Editor behavior
  tabSize: number
  insertSpaces: boolean
  wordWrap: 'on' | 'off' | 'wordWrapColumn'
  wordWrapColumn: number
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all'
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid'
  cursorStyle: 'line' | 'block' | 'underline'

  // Features
  autoSave: boolean
  autoSaveDelay: number
  formatOnSave: boolean
  formatOnPaste: boolean
  bracketPairColorization: boolean
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never'
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never'

  // Collaboration
  showCollaboratorCursors: boolean
  showCollaboratorNames: boolean
}

interface SettingsState {
  editor: EditorSettings
  updateEditor: (settings: Partial<EditorSettings>) => void
  resetEditor: () => void
}

const defaultEditorSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
  lineHeight: 1.5,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'on',
  wordWrapColumn: 80,
  minimap: true,
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  cursorBlinking: 'blink',
  cursorStyle: 'line',
  autoSave: false,
  autoSaveDelay: 1000,
  formatOnSave: false,
  formatOnPaste: false,
  bracketPairColorization: true,
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  showCollaboratorCursors: true,
  showCollaboratorNames: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editor: defaultEditorSettings,
      updateEditor: (settings) =>
        set((state) => ({
          editor: { ...state.editor, ...settings },
        })),
      resetEditor: () => set({ editor: defaultEditorSettings }),
    }),
    {
      name: 'rustyclint-settings',
    }
  )
)
