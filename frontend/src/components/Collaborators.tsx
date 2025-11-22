import { Users } from 'lucide-react'
import { useEditorStore } from '../stores/editor'

export default function Collaborators() {
  const { collaborators } = useEditorStore()

  if (collaborators.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Users size={16} className="text-gray-400" />
      <div className="flex -space-x-2">
        {collaborators.slice(0, 5).map((collab) => (
          <div
            key={collab.user_id}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-editor-bg text-xs font-medium"
            style={{ backgroundColor: collab.color }}
            title={collab.username}
          >
            {collab.username.charAt(0).toUpperCase()}
          </div>
        ))}
        {collaborators.length > 5 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-editor-bg bg-gray-600 text-xs">
            +{collaborators.length - 5}
          </div>
        )}
      </div>
    </div>
  )
}
