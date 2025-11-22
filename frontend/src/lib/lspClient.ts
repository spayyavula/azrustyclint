import type { Language } from '../types'

type LSPMessageHandler = (message: any) => void

export class LSPClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>()
  private messageHandlers: LSPMessageHandler[] = []

  constructor(
    private sessionId: string,
    private language: Language
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(
        `ws://${window.location.host}/ws/lsp/${this.sessionId}/${this.language}`
      )

      this.ws.onopen = () => {
        this.initialize().then(resolve).catch(reject)
      }

      this.ws.onerror = (error) => {
        reject(error)
      }

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      }

      this.ws.onclose = () => {
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Connection closed'))
        })
        this.pendingRequests.clear()
      }
    })
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }

  private async initialize(): Promise<any> {
    return this.request('initialize', {
      rootUri: `file:///workspace`,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          hover: {
            contentFormat: ['markdown', 'plaintext'],
          },
          definition: {},
          references: {},
          documentSymbol: {},
          codeAction: {},
          formatting: {},
          rename: {},
        },
      },
    })
  }

  private handleMessage(message: any) {
    if (message.id !== undefined) {
      // Response to a request
      const pending = this.pendingRequests.get(message.id)
      if (pending) {
        this.pendingRequests.delete(message.id)
        if (message.error) {
          pending.reject(new Error(message.error.message))
        } else {
          pending.resolve(message.result)
        }
      }
    } else {
      // Notification from server
      this.messageHandlers.forEach((handler) => handler(message))
    }
  }

  private async request(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'))
        return
      }

      const id = ++this.requestId
      this.pendingRequests.set(id, { resolve, reject })

      this.ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        })
      )
    })
  }

  private notify(method: string, params: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    this.ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      })
    )
  }

  onMessage(handler: LSPMessageHandler) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)
    }
  }

  // Document synchronization
  didOpen(uri: string, languageId: string, text: string) {
    this.notify('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text,
      },
    })
  }

  didChange(uri: string, version: number, text: string) {
    this.notify('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    })
  }

  didClose(uri: string) {
    this.notify('textDocument/didClose', {
      textDocument: { uri },
    })
  }

  // Language features
  async completion(uri: string, line: number, character: number): Promise<any> {
    return this.request('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
    })
  }

  async hover(uri: string, line: number, character: number): Promise<any> {
    return this.request('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    })
  }

  async definition(uri: string, line: number, character: number): Promise<any> {
    return this.request('textDocument/definition', {
      textDocument: { uri },
      position: { line, character },
    })
  }

  async references(uri: string, line: number, character: number): Promise<any> {
    return this.request('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration: true },
    })
  }

  async documentSymbols(uri: string): Promise<any> {
    return this.request('textDocument/documentSymbol', {
      textDocument: { uri },
    })
  }

  async formatting(uri: string): Promise<any> {
    return this.request('textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize: 2,
        insertSpaces: true,
      },
    })
  }

  async rename(uri: string, line: number, character: number, newName: string): Promise<any> {
    return this.request('textDocument/rename', {
      textDocument: { uri },
      position: { line, character },
      newName,
    })
  }

  async codeAction(uri: string, startLine: number, startChar: number, endLine: number, endChar: number, diagnostics: any[] = []): Promise<any> {
    return this.request('textDocument/codeAction', {
      textDocument: { uri },
      range: {
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar },
      },
      context: { diagnostics },
    })
  }
}

// Monaco editor LSP integration
export function registerLSPProviders(
  monaco: any,
  client: LSPClient,
  language: string,
  fileUri: string
) {
  // Completion provider
  const completionDisposable = monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '#'],
    provideCompletionItems: async (model: any, position: any) => {
      try {
        const result = await client.completion(
          fileUri,
          position.lineNumber - 1,
          position.column - 1
        )

        if (!result) return { suggestions: [] }

        const items = result.items || result
        return {
          suggestions: items.map((item: any) => ({
            label: item.label,
            kind: convertCompletionKind(item.kind),
            insertText: item.insertText || item.label,
            insertTextRules: item.insertTextFormat === 2
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            detail: item.detail,
            documentation: item.documentation,
            sortText: item.sortText,
            filterText: item.filterText,
          })),
        }
      } catch {
        return { suggestions: [] }
      }
    },
  })

  // Hover provider
  const hoverDisposable = monaco.languages.registerHoverProvider(language, {
    provideHover: async (model: any, position: any) => {
      try {
        const result = await client.hover(
          fileUri,
          position.lineNumber - 1,
          position.column - 1
        )

        if (!result || !result.contents) return null

        return {
          contents: Array.isArray(result.contents)
            ? result.contents.map(formatHoverContent)
            : [formatHoverContent(result.contents)],
        }
      } catch {
        return null
      }
    },
  })

  // Definition provider
  const definitionDisposable = monaco.languages.registerDefinitionProvider(language, {
    provideDefinition: async (model: any, position: any) => {
      try {
        const result = await client.definition(
          fileUri,
          position.lineNumber - 1,
          position.column - 1
        )

        if (!result) return null

        const locations = Array.isArray(result) ? result : [result]
        return locations.map((loc: any) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: convertRange(loc.range),
        }))
      } catch {
        return null
      }
    },
  })

  return () => {
    completionDisposable.dispose()
    hoverDisposable.dispose()
    definitionDisposable.dispose()
  }
}

function convertCompletionKind(kind: number): number {
  // LSP CompletionItemKind to Monaco CompletionItemKind
  const map: Record<number, number> = {
    1: 0,   // Text
    2: 1,   // Method
    3: 2,   // Function
    4: 3,   // Constructor
    5: 4,   // Field
    6: 5,   // Variable
    7: 6,   // Class
    8: 7,   // Interface
    9: 8,   // Module
    10: 9,  // Property
    11: 10, // Unit
    12: 11, // Value
    13: 12, // Enum
    14: 13, // Keyword
    15: 14, // Snippet
    16: 15, // Color
    17: 16, // File
    18: 17, // Reference
  }
  return map[kind] || 0
}

function formatHoverContent(content: any): { value: string } {
  if (typeof content === 'string') {
    return { value: content }
  }
  if (content.value) {
    return { value: content.value }
  }
  return { value: JSON.stringify(content) }
}

function convertRange(range: any) {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  }
}
