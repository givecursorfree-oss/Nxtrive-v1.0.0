# Nxtrive

**Chat with your documents. Entirely on your machine.**

Nxtrive is a cross-platform desktop application that turns folders of PDFs, Word files, code, and notes into a private, searchable knowledge base — then lets you ask questions and get streamed, cited answers from a local AI. No cloud uploads. No API keys. No account required.

---

## Problem Statement

Teams and individuals increasingly rely on AI to work with documents — contracts, research, internal wikis, codebases, and client files. Most solutions send your content to third-party servers. That creates real barriers:

- **Privacy risk** — Sensitive legal, medical, financial, and proprietary material cannot leave the device.
- **Compliance friction** — Regulated industries need air-gapped or on-premise workflows, not SaaS data processing agreements.
- **Cost and lock-in** — Per-token API pricing scales poorly for heavy document use; vendor dependency grows over time.
- **Trust gap** — Users cannot verify where data is stored, who can access it, or how long it is retained.
- **Offline gaps** — Travel, secure networks, and local-only environments block cloud-dependent tools entirely.

Existing “local AI” setups are often fragmented: separate embedding pipelines, vector databases, model runners, and UIs that require terminal expertise. Non-technical users need a single, polished product — not a DIY stack.

---

## Solution

Nxtrive packages retrieval-augmented generation (RAG) into one desktop experience:

1. **Point at a folder** — Select or drag-and-drop documents into a collection.
2. **Index locally** — Files are chunked, embedded, and stored in a on-disk vector database on your machine.
3. **Ask in natural language** — Questions retrieve relevant passages and stream answers from a local LLM, with source citations you can inspect.

Everything runs locally: embedding model, vector store, and text generation via **Ollama**. The app never calls external AI APIs. Your documents, embeddings, chat history, and settings stay under your control.

---

## Who It’s For

| Audience | Use case |
|----------|----------|
| **Legal & compliance** | Review contracts and policies without cloud exposure |
| **Researchers & students** | Query papers and notes offline |
| **Developers** | Search codebases and technical docs with cited context |
| **Small teams** | Shared-folder knowledge without a SaaS bill |
| **Privacy-conscious users** | Personal document Q&A with zero telemetry on content |

---

## Core Features

### Document ingestion & collections

- **Folder-based indexing** — Pick a directory; supported files are walked recursively and ingested into a named collection.
- **Drag-and-drop** — Drop files or folders onto the window for fast uploads.
- **Live progress** — Ingestion streams real-time progress (files processed, chunks created) via Server-Sent Events.
- **Multiple collections** — Organize separate knowledge bases (e.g. per client, project, or topic).
- **Source library management** — View indexed files, preview content, and remove individual sources from a collection.
- **Collection lifecycle** — Create, switch, search, pin, and delete collections from the sidebar.

### Intelligent chat

- **Streaming answers** — Token-by-token responses with stop control (`Esc`).
- **Source citations** — Answers reference the files they were drawn from; open previews to verify claims.
- **Chat history** — Conversations persist per collection in local storage.
- **Regenerate** — Re-run the last assistant response.
- **Suggested prompts** — Starter questions on empty chat to reduce cold-start friction.
- **Markdown rendering** — Rich assistant output: headings, lists, code blocks (Shiki syntax highlighting), and GFM tables.

### Response modes

| Mode | Purpose |
|------|---------|
| **Default** | Balanced Q&A grounded in retrieved context |
| **Search** | Deeper synthesis across multiple context chunks |
| **Think** | Step-by-step reasoning block, then a concise answer |
| **Sources** | Citation-heavy answers with an explicit Sources section |

### Retrieval controls

- **Configurable Top-K** — Adjust how many source chunks feed each answer (Settings → Retrieval).
- **Strict context grounding** — Prompts instruct the model to answer only from retrieved document context.

### Privacy & offline operation

- **100% local inference** — Embeddings and generation via Ollama on `127.0.0.1`.
- **No external API calls** — Document content is not sent to OpenAI, Anthropic, or similar services.
- **Local data directory** — ChromaDB vectors, source library copies, and logs live in the OS user data folder (overridable via `NXTRIVE_DATA_DIR`).

### Desktop-native experience

- **Cross-platform** — Windows, macOS (Intel & Apple Silicon), and Linux.
- **Tauri shell** — Lightweight native window; Python backend bundled as a sidecar with auto-restart.
- **Ollama setup gate** — First-run flow checks Ollama install, model availability, and can pull required models in-app.
- **Status bar** — Backend and Ollama health at a glance.
- **Keyboard shortcuts** — `Ctrl/Cmd+K` focus chat, `Ctrl/Cmd+L` clear, `Ctrl/Cmd+,` settings, `?` help, and more.
- **Light / dark / system theme** — Accessible UI with WCAG-minded patterns (skip links, focus states, reduced-motion support).
- **Welcome tour & onboarding** — Guided first-run experience for indexing and chatting.

### Library & preview

- **Indexed library panel** — Browse all files in the active collection.
- **Source preview modal** — Read extracted text from PDFs, DOCX, and plain-text formats before trusting citations.
- **File-type awareness** — Labels and icons for documents, code, and text files.

---

## Supported File Types

| Category | Extensions |
|----------|------------|
| Documents | `.pdf`, `.docx` |
| Text & markup | `.txt`, `.md`, `.csv`, `.json`, `.html`, `.css` |
| Source code | `.py`, `.js`, `.ts`, `.tsx` |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri v2 Desktop Shell (Rust)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React 19 + TypeScript + Vite UI                      │  │
│  │  Zustand state · Tailwind CSS · Motion animations     │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │ HTTP / SSE (localhost)           │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │  FastAPI Python Sidecar (PyInstaller bundle)          │  │
│  │  Ingestion · Retrieval · Chat streaming               │  │
│  └───────┬─────────────────────────────┬─────────────────┘  │
│          │                             │                    │
│          ▼                             ▼                    │
│   ChromaDB (local)              Ollama (127.0.0.1:11434)    │
│   Vector embeddings             nomic-embed-text + llama3    │
└─────────────────────────────────────────────────────────────┘
```

### Frontend stack

| Layer | Technology |
|-------|------------|
| Framework | React 19, TypeScript 5.7 |
| Build | Vite 6 |
| Desktop | Tauri 2 |
| Styling | Tailwind CSS 3, custom design tokens |
| UI primitives | Radix UI, Heroicons, Lucide |
| Animation | Motion (Framer Motion), WebGL strands (ogl) for composer effects |
| Markdown | react-markdown, remark-gfm, Shiki |
| State | Zustand + localStorage persistence |

### Backend stack

| Layer | Technology |
|-------|------------|
| API | FastAPI 0.138, Uvicorn |
| Vector DB | ChromaDB 1.5 (on-disk under user data dir) |
| LLM runtime | Ollama 0.6 client |
| PDF / Word | PyPDF, python-docx |
| Chunking | Custom recursive splitter (~512 tokens, 64-token overlap) |
| Streaming | Server-Sent Events for ingestion progress and chat tokens |

### AI models (default)

| Role | Model | Host |
|------|-------|------|
| Embeddings | `nomic-embed-text` | Ollama local |
| Generation | `llama3` | Ollama local |

Models are user-managed through Ollama; the app verifies presence and can trigger pulls on first setup.

### RAG pipeline

1. **Ingest** — Extract text → chunk (~2,048 chars with overlap) → embed via Ollama → upsert into ChromaDB collection (`nxtrive_*` prefix).
2. **Retrieve** — Embed user question → similarity search Top-K chunks.
3. **Generate** — Build mode-specific prompt with context → stream tokens from `llama3`.
4. **Deliver** — SSE pushes source list first, then tokens, then `done` event.

### API surface (local only)

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Backend + model health |
| `GET /ollama-status` | Ollama install/run state |
| `POST /ollama/pull` | Stream model downloads |
| `GET /collections` | List indexed collections |
| `POST /ingest` | Stream folder ingestion |
| `POST /ingest-drop` | Stream drag-and-drop upload ingestion |
| `POST /chat` | Stream RAG answer + sources |
| `GET /collection/{name}/sources` | List files in collection |
| `DELETE /collection/{name}/sources` | Remove a source |
| `GET /source-preview` | Preview extracted document text |

Default bind: `http://127.0.0.1:8742` (not exposed to the public internet).

### Data storage

| Data | Location |
|------|----------|
| Embeddings | `{user_data}/chroma_db/` |
| Source library | `{user_data}/source_library/` |
| Logs | `{user_data}/logs/nxtrive.log` |
| Chat history | Browser `localStorage` (per collection) |
| App settings | Browser `localStorage` |

Platform paths resolved via `platformdirs` (Windows, macOS, Linux).

---

## Platform Support

| Platform | Minimum | Distribution |
|----------|---------|--------------|
| **Windows** | Windows 10/11 (64-bit) | `.msi`, `.exe` installer |
| **macOS** | 10.15 Catalina+ | `.dmg` (Intel & Apple Silicon) |
| **Linux** | Ubuntu 22.04+ / equivalent | `.deb`, `.AppImage` |

**Prerequisites:** Python 3.11 (dev), Node.js 20, Rust (build), Ollama (runtime).

---

## Security & Privacy Posture

- **Localhost-only API** — Backend listens on loopback; CORS restricted to Tauri origins.
- **No cloud sync** — No account system, no document telemetry, no third-party AI APIs.
- **User-owned data** — Delete collections and sources from the UI; data removed from local ChromaDB.
- **Path sanitization** — Drop uploads validate paths to prevent directory traversal.
- **Transparent processing** — Open-source stack; users can audit ingestion and retrieval code.

---

## Differentiators

| vs. Cloud RAG (ChatGPT, etc.) | vs. DIY local RAG |
|-------------------------------|-------------------|
| Documents never leave the device | Single installer, no terminal wiring |
| No subscription or API metering | Polished chat UI with citations |
| Works offline after setup | Built-in Ollama setup & health checks |
| Predictable compliance story | Cross-platform desktop packaging |

---

## System Requirements (recommended)

| Resource | Guidance |
|----------|----------|
| **RAM** | 8 GB minimum; 16 GB+ recommended for larger collections |
| **Storage** | Model weights (~4–8 GB for llama3) + embedding index size |
| **GPU** | Optional; Apple Silicon and discrete GPUs accelerate Ollama |
| **Display** | 1024×768 minimum (desktop layout optimized for ≥900px width) |

---

## Roadmap-friendly positioning

Nxtrive is built for users who want **ChatGPT-over-my-files** without **uploading-my-files-to-ChatGPT**. The product focus is privacy-first document intelligence with a consumer-grade desktop experience — not another developer notebook or cloud dashboard.

---

## License

MIT — see repository `LICENSE` for details.

---

## Quick links (for website)

- **Tagline:** *Your documents. Your machine. Your answers.*
- **One-liner:** Local RAG desktop app — ingest folders, chat with citations, zero cloud.
- **CTA:** Download for Windows, macOS, or Linux.
- **Trust line:** No API keys · No account · No data leaves your device.
