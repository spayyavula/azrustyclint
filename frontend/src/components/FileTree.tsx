import { useState, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Scissors,
  FileCode,
} from 'lucide-react'
import clsx from 'clsx'
import type { File, Language } from '../types'
import { LANGUAGE_EXTENSIONS } from '../types'

interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  children?: TreeNode[]
  file?: File
}

interface FileTreeProps {
  files: File[]
  activeFileId?: string
  onFileSelect: (file: File) => void
  onFileCreate: (path: string, language: Language) => void
  onFileDelete: (fileId: string) => void
  onFileRename: (fileId: string, newPath: string) => void
}

export default function FileTree({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']))
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    node: TreeNode
  } | null>(null)
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [newItemPath, setNewItemPath] = useState<string | null>(null)

  // Build tree structure from flat file list
  const tree = buildTree(files)

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault()
    setDropTarget(path)
  }

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault()
    if (draggedNode && draggedNode.file) {
      const newPath = `${targetPath}/${draggedNode.name}`.replace(/^\/+/, '')
      onFileRename(draggedNode.file.id, newPath)
    }
    setDraggedNode(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedNode(null)
    setDropTarget(null)
  }

  const closeContextMenu = () => setContextMenu(null)

  return (
    <div className="relative h-full" onClick={closeContextMenu}>
      <TreeNodeComponent
        node={tree}
        depth={0}
        expandedFolders={expandedFolders}
        activeFileId={activeFileId}
        dropTarget={dropTarget}
        editingPath={editingPath}
        onToggle={toggleFolder}
        onSelect={onFileSelect}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onRename={(path) => setEditingPath(path)}
        onRenameSubmit={(file, newName) => {
          const dir = file.path.split('/').slice(0, -1).join('/')
          const newPath = dir ? `${dir}/${newName}` : newName
          onFileRename(file.id, newPath)
          setEditingPath(null)
        }}
        onRenameCancel={() => setEditingPath(null)}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={closeContextMenu}
          onNewFile={() => {
            const basePath = contextMenu.node.isFolder
              ? contextMenu.node.path
              : contextMenu.node.path.split('/').slice(0, -1).join('/')
            setNewItemPath(basePath)
            closeContextMenu()
          }}
          onDelete={() => {
            if (contextMenu.node.file) {
              onFileDelete(contextMenu.node.file.id)
            }
            closeContextMenu()
          }}
          onRename={() => {
            setEditingPath(contextMenu.node.path)
            closeContextMenu()
          }}
        />
      )}

      {/* New file dialog */}
      {newItemPath !== null && (
        <NewFileDialog
          basePath={newItemPath}
          onSubmit={(name, language) => {
            const path = newItemPath ? `${newItemPath}/${name}` : name
            onFileCreate(path, language)
            setNewItemPath(null)
          }}
          onCancel={() => setNewItemPath(null)}
        />
      )}
    </div>
  )
}

interface TreeNodeProps {
  node: TreeNode
  depth: number
  expandedFolders: Set<string>
  activeFileId?: string
  dropTarget: string | null
  editingPath: string | null
  onToggle: (path: string) => void
  onSelect: (file: File) => void
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void
  onDragStart: (e: React.DragEvent, node: TreeNode) => void
  onDragOver: (e: React.DragEvent, path: string) => void
  onDrop: (e: React.DragEvent, path: string) => void
  onDragEnd: () => void
  onRename: (path: string) => void
  onRenameSubmit: (file: File, newName: string) => void
  onRenameCancel: () => void
}

function TreeNodeComponent({
  node,
  depth,
  expandedFolders,
  activeFileId,
  dropTarget,
  editingPath,
  onToggle,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRename,
  onRenameSubmit,
  onRenameCancel,
}: TreeNodeProps) {
  const [renameValue, setRenameValue] = useState(node.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const isExpanded = expandedFolders.has(node.path)
  const isActive = node.file?.id === activeFileId
  const isDropTarget = dropTarget === node.path
  const isEditing = editingPath === node.path

  if (node.isFolder) {
    return (
      <div>
        <div
          className={clsx(
            'flex cursor-pointer items-center gap-1 px-2 py-1 hover:bg-editor-active',
            isDropTarget && 'bg-editor-accent/20'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onToggle(node.path)}
          onContextMenu={(e) => onContextMenu(e, node)}
          onDragOver={(e) => onDragOver(e, node.path)}
          onDrop={(e) => onDrop(e, node.path)}
        >
          {isExpanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
          {isExpanded ? (
            <FolderOpen size={14} className="text-yellow-500" />
          ) : (
            <Folder size={14} className="text-yellow-500" />
          )}
          <span className="truncate text-sm">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                activeFileId={activeFileId}
                dropTarget={dropTarget}
                editingPath={editingPath}
                onToggle={onToggle}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onRename={onRename}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-editor-active',
        isActive && 'bg-editor-active'
      )}
      style={{ paddingLeft: `${depth * 12 + 22}px` }}
      onClick={() => node.file && onSelect(node.file)}
      onContextMenu={(e) => onContextMenu(e, node)}
      draggable
      onDragStart={(e) => onDragStart(e, node)}
      onDragEnd={onDragEnd}
    >
      <FileIcon size={14} className="text-gray-400" />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => {
            if (node.file && renameValue !== node.name) {
              onRenameSubmit(node.file, renameValue)
            } else {
              onRenameCancel()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && node.file) {
              onRenameSubmit(node.file, renameValue)
            } else if (e.key === 'Escape') {
              onRenameCancel()
            }
          }}
          className="flex-1 bg-editor-bg px-1 text-sm outline-none ring-1 ring-editor-accent"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate text-sm">{node.name}</span>
      )}
    </div>
  )
}

function ContextMenu({
  x,
  y,
  node,
  onClose,
  onNewFile,
  onDelete,
  onRename,
}: {
  x: number
  y: number
  node: TreeNode
  onClose: () => void
  onNewFile: () => void
  onDelete: () => void
  onRename: () => void
}) {
  return (
    <div
      className="fixed z-50 min-w-[160px] rounded-md border border-editor-border bg-editor-sidebar py-1 shadow-lg"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-editor-active"
        onClick={onNewFile}
      >
        <Plus size={14} />
        New File
      </button>
      {!node.isFolder && (
        <>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-editor-active"
            onClick={onRename}
          >
            <Edit2 size={14} />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-editor-active"
            onClick={() => {
              if (node.file) {
                navigator.clipboard.writeText(node.file.content || '')
              }
              onClose()
            }}
          >
            <Copy size={14} />
            Copy
          </button>
          <div className="my-1 border-t border-editor-border" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 hover:bg-editor-active"
            onClick={onDelete}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </>
      )}
    </div>
  )
}

function NewFileDialog({
  basePath,
  onSubmit,
  onCancel,
}: {
  basePath: string
  onSubmit: (name: string, language: Language) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [language, setLanguage] = useState<Language>('python')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      const fullName = `${name}.${LANGUAGE_EXTENSIONS[language]}`
      onSubmit(fullName, language)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-editor-border bg-editor-sidebar p-4">
        <h3 className="mb-4 font-medium">New File</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              {basePath ? `Create in: ${basePath}/` : 'File name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm outline-none focus:border-editor-accent"
              placeholder="filename"
              autoFocus
            />
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full rounded border border-editor-border bg-editor-bg px-2 py-1 text-sm outline-none focus:border-editor-accent"
          >
            {Object.entries(LANGUAGE_EXTENSIONS).map(([lang, ext]) => (
              <option key={lang} value={lang}>
                {lang} (.{ext})
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-3 py-1 text-sm hover:bg-editor-active"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-editor-accent px-3 py-1 text-sm hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Build tree structure from flat file list
function buildTree(files: File[]): TreeNode {
  const root: TreeNode = {
    name: 'root',
    path: '',
    isFolder: true,
    children: [],
  }

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const path = parts.slice(0, i + 1).join('/')
      const isLast = i === parts.length - 1

      if (isLast) {
        // File node
        current.children = current.children || []
        current.children.push({
          name: part,
          path,
          isFolder: false,
          file,
        })
      } else {
        // Folder node
        current.children = current.children || []
        let folder = current.children.find((c) => c.name === part && c.isFolder)
        if (!folder) {
          folder = {
            name: part,
            path,
            isFolder: true,
            children: [],
          }
          current.children.push(folder)
        }
        current = folder
      }
    }
  }

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => {
      if (n.children) sortNodes(n.children)
    })
  }

  if (root.children) sortNodes(root.children)

  return root
}
