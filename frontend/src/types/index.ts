export type Language =
  | 'rust'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'c'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'

export interface User {
  id: string
  email: string
  username: string
}

export interface Project {
  id: string
  name: string
  owner_id: string
  default_language: Language
  created_at: string
  updated_at: string
}

export interface File {
  id: string
  project_id: string
  path: string
  language: Language
  content?: string
}

export interface ExecutionResult {
  stdout: string
  stderr: string
  exit_code: number
  execution_time_ms: number
  timed_out: boolean
}

export interface Collaborator {
  user_id: string
  username: string
  color: string
  cursor?: {
    line: number
    column: number
  }
}

export const LANGUAGE_EXTENSIONS: Record<Language, string> = {
  rust: 'rs',
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  go: 'go',
  java: 'java',
  csharp: 'cs',
  cpp: 'cpp',
  c: 'c',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  rust: 'Rust',
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
}

// Monaco editor language IDs
export const MONACO_LANGUAGES: Record<Language, string> = {
  rust: 'rust',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  go: 'go',
  java: 'java',
  csharp: 'csharp',
  cpp: 'cpp',
  c: 'c',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
}
