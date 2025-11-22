# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RustyClint is a secure, collaborative online IDE built with Rust. It supports multiple programming languages with real-time collaboration, Docker-based sandboxed execution, and LSP integration for code intelligence.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Web)                        │
│  Monaco Editor │ WebRTC │ Yjs Client │ React/Solid      │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket / HTTP
┌─────────────────────▼───────────────────────────────────┐
│                 API Gateway (Rust/Axum)                  │
│  Auth │ Rate Limiting │ Request Routing │ Session Mgmt  │
└────┬────────────┬────────────┬────────────┬─────────────┘
     │            │            │            │
┌────▼────┐ ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
│ Collab  │ │  Sandbox  │ │   LSP   │ │   Media   │
│ Service │ │Orchestrator│ │  Proxy  │ │  Server   │
│ (CRDT)  │ │ (Docker)  │ │         │ │ (WebRTC)  │
└─────────┘ └─────┬─────┘ └────┬────┘ └───────────┘
                  │            │
            ┌─────▼────────────▼──┐
            │   Docker Containers │
            │    (per user)       │
            └─────────────────────┘
```

## Crate Structure

- **api-gateway**: Main HTTP/WebSocket server (Axum), authentication, routing
- **collab**: Real-time collaboration using Yrs (Rust Yjs port) CRDTs
- **sandbox**: Docker container orchestration for secure code execution
- **lsp-proxy**: Language Server Protocol proxy for code intelligence
- **common**: Shared types, models, and error definitions

## Build Commands

```bash
cargo build                    # Build all crates
cargo build --release          # Release build
cargo run -p rustyclint-api-gateway  # Run the API server
cargo test                     # Run all tests
cargo test -p rustyclint-sandbox     # Test specific crate
cargo clippy --all-targets     # Run linter
cargo fmt --all                # Format code
```

## Development Setup

```bash
# Start dependencies
docker-compose up -d postgres redis

# Run migrations
sqlx database create
sqlx migrate run

# Build sandbox images
docker build -f docker/sandbox-base.Dockerfile -t rustyclint/sandbox-base:latest .
docker build -f docker/sandbox-rust.Dockerfile -t rustyclint/sandbox-rust:latest .
docker build -f docker/sandbox-python.Dockerfile -t rustyclint/sandbox-python:latest .
docker build -f docker/sandbox-node.Dockerfile -t rustyclint/sandbox-node:latest .

# Run the server
cargo run
```

## Configuration

Configuration is loaded from (in order):
1. `config/default.toml`
2. `config/local.toml` (gitignored)
3. Environment variables with `RUSTYCLINT_` prefix

Key environment variables:
- `RUSTYCLINT_DATABASE_URL`: PostgreSQL connection string
- `RUSTYCLINT_REDIS_URL`: Redis connection string
- `RUSTYCLINT_JWT_SECRET`: Secret for JWT signing
- `RUST_LOG`: Logging level (e.g., `info,tower_http=debug`)

## Security Model

- Code execution in isolated Docker containers with:
  - No network access by default
  - Read-only root filesystem
  - Memory/CPU limits
  - Dropped capabilities
  - Non-root user
- JWT-based authentication
- Argon2 password hashing
- Rate limiting on API endpoints

## Key Dependencies

- **axum**: Web framework
- **sqlx**: Async PostgreSQL
- **bollard**: Docker API client
- **yrs**: Yjs CRDT implementation
- **jsonwebtoken**: JWT handling
- **tower-lsp**: LSP protocol support

## API Structure

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET/POST /api/v1/projects` - List/create projects
- `POST /api/v1/sandbox/run` - Execute code
- `WS /ws/collab/:file_id` - Real-time collaboration
- `WS /ws/terminal/:session_id` - Terminal session
- `WS /ws/signaling/:room_id` - WebRTC signaling

## Supported Languages

Rust, Python, JavaScript, TypeScript, Go, Java, C#, C++, C, Ruby, PHP, Swift, Kotlin

Each language has a corresponding Docker sandbox image and LSP server configuration.

## Frontend

The frontend is built with React + Vite + TypeScript, located in `/frontend`.

### Frontend Structure

- **src/pages**: Route pages (Login, Register, Dashboard, Editor)
- **src/components**: UI components
  - `CodeEditor.tsx` - Monaco with Yjs collaboration
  - `FileTree.tsx` - Nested folders, drag-drop, context menus
  - `Terminal.tsx` - WebSocket PTY terminal
  - `SettingsPanel.tsx` - Editor preferences
  - `VideoChat.tsx` - WebRTC video/voice
  - `OutputPanel.tsx` - Execution results
  - `Toast.tsx` - Notifications
  - `ErrorBoundary.tsx` - Error handling
  - `LoadingSpinner.tsx` - Loading states
- **src/stores**: Zustand state (auth, editor, settings)
- **src/hooks**: Custom hooks (useKeyboardShortcuts)
- **src/lib**: API client, LSP client
- **src/types**: TypeScript definitions

### Frontend Commands

```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (port 5173)
npm run build            # Build for production
npm run lint             # Run ESLint
```

### Key Frontend Dependencies

- **@monaco-editor/react**: VS Code editor component
- **yjs + y-monaco + y-websocket**: Real-time collaboration
- **@tanstack/react-query**: Server state management
- **zustand**: Client state management
- **tailwindcss**: Styling

### Frontend Features

- Monaco Editor with syntax highlighting for all supported languages
- Real-time collaborative editing with Yjs CRDTs
- Live cursor positions and user awareness
- Code execution with output panel
- Project and file management with drag-drop
- WebRTC video/voice chat
- JWT authentication with persistent sessions
- Integrated terminal with PTY support
- LSP integration (autocomplete, hover, go-to-definition)
- Customizable settings (theme, font, behavior)
- Keyboard shortcuts (Ctrl+S save, Ctrl+Enter run, etc.)
- Toast notifications and error boundaries
