import { useEffect, useRef, useState } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import clsx from 'clsx'

interface TerminalProps {
  sessionId: string
  onClose?: () => void
}

export default function Terminal({ sessionId, onClose }: TerminalProps) {
  const [lines, setLines] = useState<string[]>(['$ Connected to sandbox terminal'])
  const [input, setInput] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Connect to terminal WebSocket
    const ws = new WebSocket(`ws://${window.location.host}/ws/terminal/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setLines((prev) => [...prev, '$ Terminal connected'])
    }

    ws.onmessage = (event) => {
      const data = event.data
      setLines((prev) => [...prev, data])
    }

    ws.onclose = () => {
      setIsConnected(false)
      setLines((prev) => [...prev, '$ Connection closed'])
    }

    ws.onerror = () => {
      setLines((prev) => [...prev, '$ Connection error'])
    }

    return () => {
      ws.close()
    }
  }, [sessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !wsRef.current || !isConnected) return

    // Send command to terminal
    wsRef.current.send(input)
    setLines((prev) => [...prev, `$ ${input}`])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      // TODO: Command history
      e.preventDefault()
    } else if (e.key === 'ArrowDown') {
      // TODO: Command history
      e.preventDefault()
    } else if (e.ctrlKey && e.key === 'c') {
      // Send interrupt signal
      wsRef.current?.send('\x03')
    } else if (e.ctrlKey && e.key === 'l') {
      // Clear terminal
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div
      className={clsx(
        'flex flex-col border-t border-editor-border bg-black',
        isMaximized ? 'fixed inset-0 z-50' : 'h-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-editor-border bg-editor-sidebar px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Terminal</span>
          <span
            className={clsx(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="rounded p-1 hover:bg-editor-active"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="rounded p-1 hover:bg-editor-active">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm text-green-400"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex border-t border-editor-border">
        <span className="px-4 py-2 text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          className="flex-1 bg-transparent py-2 pr-4 font-mono text-sm text-green-400 outline-none"
          placeholder={isConnected ? 'Enter command...' : 'Disconnected'}
          autoFocus
        />
      </form>
    </div>
  )
}

// Simpler inline terminal for quick commands
export function QuickTerminal({
  onCommand,
}: {
  onCommand: (cmd: string) => Promise<string>
}) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isRunning) return

    setIsRunning(true)
    setOutput((prev) => [...prev, `$ ${input}`])

    try {
      const result = await onCommand(input)
      setOutput((prev) => [...prev, result])
    } catch (error) {
      setOutput((prev) => [...prev, `Error: ${error}`])
    } finally {
      setIsRunning(false)
      setInput('')
    }
  }

  return (
    <div className="rounded-lg border border-editor-border bg-black p-4">
      <div className="mb-2 max-h-40 overflow-auto font-mono text-xs text-green-400">
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <span className="text-green-400">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isRunning}
          className="flex-1 bg-transparent font-mono text-sm text-green-400 outline-none"
          placeholder="command"
        />
      </form>
    </div>
  )
}
