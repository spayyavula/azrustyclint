import { X, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useEditorStore } from '../stores/editor'
import clsx from 'clsx'

export default function OutputPanel() {
  const { executionResult, isRunning, outputOpen, toggleOutput } = useEditorStore()

  if (!outputOpen) return null

  return (
    <div className="flex h-64 flex-col border-t border-editor-border bg-editor-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-editor-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Output</span>
          {executionResult && (
            <span
              className={clsx(
                'flex items-center gap-1 text-xs',
                executionResult.exit_code === 0 ? 'text-green-500' : 'text-red-500'
              )}
            >
              {executionResult.exit_code === 0 ? (
                <CheckCircle size={12} />
              ) : (
                <XCircle size={12} />
              )}
              Exit: {executionResult.exit_code}
            </span>
          )}
          {executionResult && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} />
              {executionResult.execution_time_ms}ms
            </span>
          )}
          {executionResult?.timed_out && (
            <span className="flex items-center gap-1 text-xs text-yellow-500">
              <AlertTriangle size={12} />
              Timed out
            </span>
          )}
        </div>
        <button
          onClick={toggleOutput}
          className="rounded p-1 hover:bg-editor-active"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {isRunning ? (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-editor-accent border-t-transparent" />
            Running...
          </div>
        ) : executionResult ? (
          <div className="space-y-2">
            {executionResult.stdout && (
              <div>
                <div className="mb-1 text-xs text-gray-500">stdout:</div>
                <pre className="whitespace-pre-wrap text-editor-text">
                  {executionResult.stdout}
                </pre>
              </div>
            )}
            {executionResult.stderr && (
              <div>
                <div className="mb-1 text-xs text-gray-500">stderr:</div>
                <pre className="whitespace-pre-wrap text-red-400">
                  {executionResult.stderr}
                </pre>
              </div>
            )}
            {!executionResult.stdout && !executionResult.stderr && (
              <div className="text-gray-500">No output</div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Run code to see output</div>
        )}
      </div>
    </div>
  )
}
