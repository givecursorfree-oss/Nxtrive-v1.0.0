# Nxtrive — Local AI Document Chat

Nxtrive is a cross-platform desktop application that lets you chat with your local documents using a **100% offline** LLM. Point it at a folder of PDFs, Word docs, or code files, ingest them into a local vector database, and ask questions with streamed answers. **Zero data leaves your machine. No API keys required.**

## Prerequisites by platform

### Windows
- Windows 10/11 (64-bit)
- Python 3.11 from [python.org](https://www.python.org/downloads/) (check **Add to PATH**)
- Node.js 20 LTS from [nodejs.org](https://nodejs.org/)
- Rust from [rustup.rs](https://rustup.rs/)
- Ollama from [https://ollama.com/download/windows](https://ollama.com/download/windows)

### macOS
- macOS 10.15 Catalina or later
- Python 3.11: `brew install python@3.11`
- Node.js 20: `brew install node`
- Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Ollama from [https://ollama.com/download/mac](https://ollama.com/download/mac)
- Apple Silicon (M1/M2/M3): all supported; `llama3` runs efficiently on Apple Silicon

### Linux (Ubuntu/Debian)
- Ubuntu 22.04+ or equivalent
- `sudo apt install python3.11 python3.11-venv nodejs npm`
- Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- `sudo apt install libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf`
- Ollama: `curl -fsSL https://ollama.com/install.sh | sh`

## Ollama model setup

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

## Backend setup (development)

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

The API runs at `http://127.0.0.1:8742`.

## Frontend setup (development)

```bash
npm install
npm run tauri dev
```

For development without a bundled sidecar, start the Python backend separately (see above) before launching Tauri.

## Build for distribution

### 1. Build the Python backend sidecar

**macOS / Linux**
```bash
bash scripts/build-backend.sh
```

**Windows**
```powershell
.\scripts\build-backend.ps1
```

### 2. Build the desktop app

```bash
npm install
npm run tauri build
```

Installers are generated under `src-tauri/target/release/bundle/`.

### Download pre-built releases

When published via GitHub Actions tags (`v*`):

- **Windows:** `Nxtrive_x64.msi` or `Nxtrive_x64-setup.exe`
- **macOS Intel:** `Nxtrive_x64.dmg`
- **macOS Apple Silicon:** `Nxtrive_aarch64.dmg`
- **Linux:** `Nxtrive_amd64.deb` or `Nxtrive_amd64.AppImage`

## Architecture

Nxtrive uses a **Tauri v2 + React** frontend and a **FastAPI Python backend** bundled as a sidecar. The desktop shell launches the backend process, passes a platform-specific user data directory via `NXTRIVE_DATA_DIR`, and the React UI communicates over HTTP with Server-Sent Events for real-time ingestion progress and chat token streaming. ChromaDB stores embeddings on disk under the user's app data folder, and Ollama provides both `nomic-embed-text` embeddings and `llama3` generation locally at `127.0.0.1:11434`.

Document ingestion walks supported files recursively, normalizes paths as POSIX metadata for cross-platform portability, chunks text with a custom recursive splitter, embeds each chunk through Ollama, and stores vectors in ChromaDB collections prefixed with `nxtrive_`. At query time, the retriever embeds the question, fetches top-K chunks, builds a strict context-only prompt, and streams tokens from `llama3` back to the UI.

## Interview talking points

1. **Privacy by design:** All embeddings, retrieval, and generation happen locally. The app never calls external APIs, making it suitable for sensitive legal, medical, or proprietary documents.
2. **Cross-platform sidecar architecture:** Python is packaged with PyInstaller and launched as a Tauri sidecar with auto-restart, while user data paths are resolved per OS via `platformdirs`.
3. **Streaming UX with SSE:** Both ingestion progress and chat answers stream over Server-Sent Events, giving responsive feedback during long document processing and token-by-token answers.

## Project structure

```
nxtrive/
├── backend/          # FastAPI RAG service
├── src/              # React + TypeScript UI
├── src-tauri/        # Tauri shell + sidecar config
├── scripts/          # Cross-platform backend build scripts
└── .github/workflows # CI builds for Windows, macOS, Linux
```

## Supported file types

- PDF (`.pdf`)
- Word (`.docx`)
- Text/code (`.txt`, `.py`, `.js`, `.ts`, `.tsx`, `.md`, `.csv`, `.json`, `.html`, `.css`)

## License

MIT
