# Nxtrive

**Offline local RAG for your documents — Windows, macOS, and Linux.**

Nxtrive is a free, open-source desktop app for **retrieval-augmented generation (RAG)** that runs entirely on your machine. Index PDFs, Word files, Markdown, and code folders into a private vector store, then chat with cited answers from a local LLM. **No cloud APIs. No API keys. No account.**

Built for air-gapped workflows, regulated environments, and anyone who wants document AI without sending data off-device.

---

## Why Nxtrive

| | Cloud RAG tools | Nxtrive |
|---|----------------|---------|
| Document uploads | Sent to vendor servers | Stay on your disk |
| Embeddings & chat | Remote API | Local Ollama + ChromaDB |
| Internet required | Yes (after setup) | Works offline after models are pulled |
| Cost model | Per-token billing | Free & open source |

---

## Features

- **Folder & drag-and-drop ingestion** — Build named collections from directories or dropped files
- **Streaming chat with citations** — Token-by-token answers grounded in retrieved context
- **Multiple collections** — Separate knowledge bases per project, client, or topic
- **Response modes** — Default, Search, Think, and Sources-focused answers
- **Source preview & management** — Inspect indexed files and remove individual sources
- **100% local backend** — FastAPI sidecar on `127.0.0.1`; no external AI calls
- **Cross-platform installers** — `.msi` / `.exe` (Windows), `.dmg` (macOS Apple Silicon), `.deb` / `.rpm` (Linux)

### Supported file types

`.pdf` · `.docx` · `.txt` · `.md` · `.csv` · `.json` · `.html` · `.css` · `.py` · `.js` · `.ts` · `.tsx`

---

## Download

Pre-built installers are published on **[GitHub Releases](https://github.com/devzeromax/Nxtrive/releases)**.

| Platform | Installers |
|----------|------------|
| **Windows** | `Nxtrive_1.0.0_x64_en-US.msi`, `Nxtrive_1.0.0_x64-setup.exe` |
| **macOS** | `Nxtrive_1.0.0_aarch64.dmg` (Apple Silicon) |
| **Linux** | `Nxtrive_1.0.0_amd64.deb`, `Nxtrive-1.0.0-1.x86_64.rpm` |

### Prerequisites (all platforms)

1. Install **[Ollama](https://ollama.com/download)**
2. Pull required models:

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

3. Run the installer for your OS and launch **Nxtrive**.

---

## Quick start (development)

### 1. Clone the repository

```bash
git clone https://github.com/devzeromax/Nxtrive.git
cd Nxtrive
```

### 2. Start the Python backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```

API: `http://127.0.0.1:8742`

### 3. Start the desktop app

```bash
npm install
npm run tauri dev
```

---

## Build from source

```bash
# Backend sidecar (PyInstaller)
bash scripts/build-backend.sh          # macOS / Linux
.\scripts\build-backend.ps1            # Windows

# Desktop installers
npm install
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Tauri 2 + React (desktop UI)           │
│  localhost HTTP + SSE streaming         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  FastAPI Python sidecar (PyInstaller)     │
│  Ingest · chunk · retrieve · stream       │
└──────────┬─────────────────┬──────────────┘
           │                 │
    ┌──────▼──────┐   ┌──────▼──────┐
    │  ChromaDB   │   │   Ollama    │
    │  (on disk)  │   │ 127.0.0.1   │
    └─────────────┘   └─────────────┘
```

- **Frontend:** React, TypeScript, Tauri v2  
- **Backend:** FastAPI, ChromaDB, Ollama (`llama3` + `nomic-embed-text`)  
- **Data:** User documents and embeddings live under the OS app-data directory — never bundled in installers  

---

## Privacy & security

- Backend listens on **loopback only** (`127.0.0.1`)
- **No telemetry** on document content
- **No cloud sync** or third-party AI APIs
- Path sanitization on uploads to block directory traversal
- Installers contain **no user data** — only the application binaries

---

## Project structure

```
├── backend/          # FastAPI RAG service
├── src/              # React + TypeScript UI
├── src-tauri/        # Tauri shell & sidecar config
├── scripts/          # Cross-platform backend build scripts
└── .github/workflows # CI builds (Windows, macOS, Linux)
```

---

## Contributing

Issues and pull requests are welcome at [github.com/devzeromax/Nxtrive](https://github.com/devzeromax/Nxtrive).

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Nxtrive</strong> — Your documents. Your machine. Your answers.
</p>
