import { useState } from 'react'
import { X, RotateCcw, Monitor, Type, Code, Users, Keyboard } from 'lucide-react'
import { useSettingsStore, EditorTheme } from '../stores/settings'
import { SHORTCUTS_LIST } from '../hooks/useKeyboardShortcuts'
import clsx from 'clsx'

interface SettingsPanelProps {
  onClose: () => void
}

type TabId = 'appearance' | 'editor' | 'features' | 'collaboration' | 'shortcuts'

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('appearance')
  const { editor, updateEditor, resetEditor } = useSettingsStore()

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={16} /> },
    { id: 'editor', label: 'Editor', icon: <Type size={16} /> },
    { id: 'features', label: 'Features', icon: <Code size={16} /> },
    { id: 'collaboration', label: 'Collaboration', icon: <Users size={16} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-[800px] flex-col overflow-hidden rounded-lg border border-editor-border bg-editor-sidebar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-editor-border px-4 py-3">
          <h2 className="text-lg font-medium">Settings</h2>
          <div className="flex gap-2">
            <button
              onClick={resetEditor}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-editor-active"
              title="Reset to defaults"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button onClick={onClose} className="rounded p-1 hover:bg-editor-active">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-48 border-r border-editor-border p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm',
                  activeTab === tab.id ? 'bg-editor-active' : 'hover:bg-editor-active/50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <SettingGroup title="Theme">
                  <SelectSetting
                    label="Color Theme"
                    value={editor.theme}
                    options={[
                      { value: 'vs-dark', label: 'Dark (Visual Studio)' },
                      { value: 'vs-light', label: 'Light (Visual Studio)' },
                      { value: 'hc-black', label: 'High Contrast' },
                    ]}
                    onChange={(value) => updateEditor({ theme: value as EditorTheme })}
                  />
                </SettingGroup>

                <SettingGroup title="Font">
                  <NumberSetting
                    label="Font Size"
                    value={editor.fontSize}
                    min={8}
                    max={32}
                    onChange={(value) => updateEditor({ fontSize: value })}
                  />
                  <TextSetting
                    label="Font Family"
                    value={editor.fontFamily}
                    onChange={(value) => updateEditor({ fontFamily: value })}
                  />
                  <NumberSetting
                    label="Line Height"
                    value={editor.lineHeight}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(value) => updateEditor({ lineHeight: value })}
                  />
                </SettingGroup>

                <SettingGroup title="Display">
                  <ToggleSetting
                    label="Minimap"
                    description="Show minimap on the right side"
                    value={editor.minimap}
                    onChange={(value) => updateEditor({ minimap: value })}
                  />
                  <SelectSetting
                    label="Line Numbers"
                    value={editor.lineNumbers}
                    options={[
                      { value: 'on', label: 'On' },
                      { value: 'off', label: 'Off' },
                      { value: 'relative', label: 'Relative' },
                    ]}
                    onChange={(value) =>
                      updateEditor({ lineNumbers: value as 'on' | 'off' | 'relative' })
                    }
                  />
                  <SelectSetting
                    label="Render Whitespace"
                    value={editor.renderWhitespace}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'boundary', label: 'Boundary' },
                      { value: 'selection', label: 'Selection' },
                      { value: 'all', label: 'All' },
                    ]}
                    onChange={(value) =>
                      updateEditor({
                        renderWhitespace: value as 'none' | 'boundary' | 'selection' | 'all',
                      })
                    }
                  />
                </SettingGroup>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <SettingGroup title="Indentation">
                  <NumberSetting
                    label="Tab Size"
                    value={editor.tabSize}
                    min={1}
                    max={8}
                    onChange={(value) => updateEditor({ tabSize: value })}
                  />
                  <ToggleSetting
                    label="Insert Spaces"
                    description="Use spaces instead of tabs"
                    value={editor.insertSpaces}
                    onChange={(value) => updateEditor({ insertSpaces: value })}
                  />
                </SettingGroup>

                <SettingGroup title="Word Wrap">
                  <SelectSetting
                    label="Word Wrap"
                    value={editor.wordWrap}
                    options={[
                      { value: 'on', label: 'On' },
                      { value: 'off', label: 'Off' },
                      { value: 'wordWrapColumn', label: 'At Column' },
                    ]}
                    onChange={(value) =>
                      updateEditor({ wordWrap: value as 'on' | 'off' | 'wordWrapColumn' })
                    }
                  />
                  {editor.wordWrap === 'wordWrapColumn' && (
                    <NumberSetting
                      label="Wrap Column"
                      value={editor.wordWrapColumn}
                      min={40}
                      max={200}
                      onChange={(value) => updateEditor({ wordWrapColumn: value })}
                    />
                  )}
                </SettingGroup>

                <SettingGroup title="Cursor">
                  <SelectSetting
                    label="Cursor Style"
                    value={editor.cursorStyle}
                    options={[
                      { value: 'line', label: 'Line' },
                      { value: 'block', label: 'Block' },
                      { value: 'underline', label: 'Underline' },
                    ]}
                    onChange={(value) =>
                      updateEditor({ cursorStyle: value as 'line' | 'block' | 'underline' })
                    }
                  />
                  <SelectSetting
                    label="Cursor Blinking"
                    value={editor.cursorBlinking}
                    options={[
                      { value: 'blink', label: 'Blink' },
                      { value: 'smooth', label: 'Smooth' },
                      { value: 'phase', label: 'Phase' },
                      { value: 'expand', label: 'Expand' },
                      { value: 'solid', label: 'Solid' },
                    ]}
                    onChange={(value) =>
                      updateEditor({
                        cursorBlinking: value as 'blink' | 'smooth' | 'phase' | 'expand' | 'solid',
                      })
                    }
                  />
                </SettingGroup>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-6">
                <SettingGroup title="Auto Save">
                  <ToggleSetting
                    label="Auto Save"
                    description="Automatically save files after changes"
                    value={editor.autoSave}
                    onChange={(value) => updateEditor({ autoSave: value })}
                  />
                  {editor.autoSave && (
                    <NumberSetting
                      label="Auto Save Delay (ms)"
                      value={editor.autoSaveDelay}
                      min={100}
                      max={10000}
                      step={100}
                      onChange={(value) => updateEditor({ autoSaveDelay: value })}
                    />
                  )}
                </SettingGroup>

                <SettingGroup title="Formatting">
                  <ToggleSetting
                    label="Format On Save"
                    description="Format file when saving"
                    value={editor.formatOnSave}
                    onChange={(value) => updateEditor({ formatOnSave: value })}
                  />
                  <ToggleSetting
                    label="Format On Paste"
                    description="Format pasted content"
                    value={editor.formatOnPaste}
                    onChange={(value) => updateEditor({ formatOnPaste: value })}
                  />
                </SettingGroup>

                <SettingGroup title="Brackets">
                  <ToggleSetting
                    label="Bracket Pair Colorization"
                    description="Colorize matching brackets"
                    value={editor.bracketPairColorization}
                    onChange={(value) => updateEditor({ bracketPairColorization: value })}
                  />
                  <SelectSetting
                    label="Auto Closing Brackets"
                    value={editor.autoClosingBrackets}
                    options={[
                      { value: 'always', label: 'Always' },
                      { value: 'languageDefined', label: 'Language Defined' },
                      { value: 'beforeWhitespace', label: 'Before Whitespace' },
                      { value: 'never', label: 'Never' },
                    ]}
                    onChange={(value) =>
                      updateEditor({
                        autoClosingBrackets: value as any,
                      })
                    }
                  />
                </SettingGroup>
              </div>
            )}

            {activeTab === 'collaboration' && (
              <div className="space-y-6">
                <SettingGroup title="Cursors">
                  <ToggleSetting
                    label="Show Collaborator Cursors"
                    description="Display other users' cursor positions"
                    value={editor.showCollaboratorCursors}
                    onChange={(value) => updateEditor({ showCollaboratorCursors: value })}
                  />
                  <ToggleSetting
                    label="Show Collaborator Names"
                    description="Display usernames above cursors"
                    value={editor.showCollaboratorNames}
                    onChange={(value) => updateEditor({ showCollaboratorNames: value })}
                  />
                </SettingGroup>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Keyboard shortcuts for common actions
                </p>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400">
                      <th className="pb-2">Action</th>
                      <th className="pb-2">Shortcut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHORTCUTS_LIST.map((shortcut) => (
                      <tr key={shortcut.keys} className="text-sm">
                        <td className="py-1.5">{shortcut.description}</td>
                        <td className="py-1.5">
                          <kbd className="rounded bg-editor-bg px-2 py-0.5 font-mono text-xs">
                            {shortcut.keys}
                          </kbd>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Setting components
function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-gray-400">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm">{label}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          'relative h-5 w-9 rounded-full transition-colors',
          value ? 'bg-editor-accent' : 'bg-editor-border'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            value ? 'left-4' : 'left-0.5'
          )}
        />
      </button>
    </div>
  )
}

function NumberSetting({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm outline-none focus:border-editor-accent"
      />
    </div>
  )
}

function TextSetting({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm outline-none focus:border-editor-accent"
      />
    </div>
  )
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm outline-none focus:border-editor-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
