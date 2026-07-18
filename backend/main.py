"""FastAPI application entrypoint."""

from __future__ import annotations

import json
import logging
import platform
import shutil
import signal
import sys
import uuid
import asyncio
import contextlib
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Generator

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.requests import Request

from config import (
    BACKEND_HOST,
    CORS_ALLOW_METHODS,
    CORS_ORIGIN_REGEX,
    get_data_dir,
    resolve_backend_port,
    setup_logging,
)
from security import (
    MAX_INGEST_FILES_PER_FOLDER,
    MAX_UPLOAD_FILES_PER_DROP,
    MAX_UPLOAD_FILE_BYTES,
    MAX_UPLOAD_TOTAL_BYTES,
    ensure_within_directory,
    validate_collection_name,
    validate_folder_path,
    validate_relative_upload_path,
    validate_root_name,
)
from errors import format_ollama_error
from privacy import sanitize_error_message
from models import (
    ChatRequest,
    CollectionSourcesResponse,
    CollectionsResponse,
    DeleteCollectionResponse,
    DeleteSourceRequest,
    DeleteSourceResponse,
    HealthResponse,
    IngestRequest,
    OllamaPullRequest,
    OllamaStatusResponse,
    SourcePreviewResponse,
)
from ollama_checker import (
    check_ollama,
    get_cached_ollama_status,
    get_ollama_status,
    iter_pull_models,
    refresh_ollama_cache,
)
from process_registry import terminate_tracked_processes

logger = logging.getLogger(__name__)

# Lazy-loaded — chromadb imports are heavy and must not block /health on cold start.
ingestor = None
retriever = None
BACKEND_PORT: int | None = None


def get_ingestor():
    global ingestor
    if ingestor is None:
        from ingestor import DocumentIngestor

        ingestor = DocumentIngestor()
    return ingestor


def get_retriever():
    global retriever
    if retriever is None:
        from retriever import DocumentRetriever

        retriever = DocumentRetriever()
    return retriever


def get_backend_port() -> int:
    global BACKEND_PORT
    if BACKEND_PORT is None:
        BACKEND_PORT = resolve_backend_port()
    return BACKEND_PORT


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()

    def handle_shutdown_signal(*_: object) -> None:
        terminate_tracked_processes()
        raise SystemExit(0)

    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    port = get_backend_port()
    logger.info("Nxtrive backend listening on %s (port %s)", platform.system(), port)
    logger.info("Local data store initialized")

    async def poll_ollama_status() -> None:
        while True:
            try:
                await asyncio.to_thread(refresh_ollama_cache)
            except Exception:
                logger.exception("Background Ollama status refresh failed")
            await asyncio.sleep(4)

    ollama_task = asyncio.create_task(poll_ollama_status())

    try:
        yield
    finally:
        ollama_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await ollama_task
        terminate_tracked_processes()
        logger.info("Nxtrive backend stopped")


app = FastAPI(title="Nxtrive API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=["Content-Type", "Accept"],
)


def _sse_event(payload: dict | str) -> str:
    if isinstance(payload, str):
        data = json.dumps({"token": payload})
    else:
        data = json.dumps(payload)
    return f"data: {data}\n\n"


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    cached = get_cached_ollama_status()
    return HealthResponse(
        status="ok",
        models=cached["models"] if cached else [],
        platform=platform.system(),
        port=get_backend_port(),
    )


@app.get("/ollama-status", response_model=OllamaStatusResponse)
def ollama_status() -> OllamaStatusResponse:
    status = refresh_ollama_cache()
    safe_status = {**status, "error": sanitize_error_message(status.get("error"))}
    safe_status.pop("binary_path", None)
    return OllamaStatusResponse(**safe_status)


@app.post("/ollama/pull")
def pull_ollama_models(request: OllamaPullRequest) -> StreamingResponse:
    status = check_ollama()
    if not status["installed"]:
        raise HTTPException(status_code=400, detail="Install Ollama before downloading models")

    models = request.models or status["missing_models"]
    if not models:
        raise HTTPException(status_code=400, detail="All required models are already installed")

    def event_stream() -> Generator[str, None, None]:
        for progress in iter_pull_models(models):
            yield _sse_event(progress)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/collections", response_model=CollectionsResponse)
def list_collections() -> CollectionsResponse:
    try:
        collections = get_ingestor().list_collections()
        return CollectionsResponse(collections=collections)
    except Exception as exc:
        logger.exception("Failed to list collections")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest")
def ingest_documents(request: IngestRequest) -> StreamingResponse:
    folder = str(validate_folder_path(request.folder_path))
    collection = validate_collection_name(request.collection_name)

    def event_stream() -> Generator[str, None, None]:
        try:
            for progress in get_ingestor().ingest_folder(folder, collection):
                yield _sse_event(progress)
        except FileNotFoundError as exc:
            yield _sse_event({"status": "error", "error": str(exc)})
        except Exception as exc:
            logger.exception("Ingestion failed")
            yield _sse_event({"status": "error", "error": str(exc)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/ingest-drop")
async def ingest_dropped_files(
    collection_name: str = Form(...),
    root_name: str = Form(...),
    paths: list[str] = Form(...),
    files: list[UploadFile] = File(...),
) -> StreamingResponse:
    if len(paths) != len(files):
        raise HTTPException(status_code=400, detail="paths and files count mismatch")
    if not paths:
        raise HTTPException(status_code=400, detail="No files were uploaded")
    if len(paths) > MAX_UPLOAD_FILES_PER_DROP:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files (max {MAX_UPLOAD_FILES_PER_DROP})",
        )

    collection = validate_collection_name(collection_name)
    safe_root_name = validate_root_name(root_name)

    drop_root = get_data_dir() / "drops" / uuid.uuid4().hex
    drop_root.mkdir(parents=True, exist_ok=True)
    folder_path = drop_root / safe_root_name
    folder_path.mkdir(parents=True, exist_ok=True)
    total_bytes = 0

    try:
        for relative_path, upload in zip(paths, files):
            safe_path = validate_relative_upload_path(relative_path)
            dest = ensure_within_directory(folder_path, folder_path / safe_path)
            dest.parent.mkdir(parents=True, exist_ok=True)

            written = 0
            with dest.open("wb") as handle:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    written += len(chunk)
                    total_bytes += len(chunk)
                    if written > MAX_UPLOAD_FILE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail=f"File too large (max {MAX_UPLOAD_FILE_BYTES // (1024 * 1024)} MB)",
                        )
                    if total_bytes > MAX_UPLOAD_TOTAL_BYTES:
                        raise HTTPException(status_code=413, detail="Upload batch too large")
                    handle.write(chunk)
    except HTTPException:
        shutil.rmtree(drop_root, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(drop_root, ignore_errors=True)
        logger.exception("Failed to save dropped files")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    def event_stream() -> Generator[str, None, None]:
        try:
            for progress in get_ingestor().ingest_folder(str(folder_path), collection):
                yield _sse_event(progress)
        except FileNotFoundError as exc:
            yield _sse_event({"status": "error", "error": str(exc)})
        except Exception as exc:
            logger.exception("Drop ingestion failed")
            yield _sse_event({"status": "error", "error": str(exc)})
        finally:
            shutil.rmtree(drop_root, ignore_errors=True)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/chat")
def chat(request: ChatRequest) -> StreamingResponse:
    question = request.question.strip()
    collection = request.collection_name

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    def token_stream() -> Generator[str, None, None]:
        try:
            top_k = request.top_k
            mode = request.response_mode
            sources = get_retriever().get_sources_for_question(question, collection, top_k, mode)
            yield _sse_event({"type": "sources", "sources": sources})
            for token in get_retriever().stream_answer(question, collection, top_k, mode):
                yield _sse_event(token)
            yield _sse_event({"type": "done"})
        except ValueError as exc:
            yield _sse_event({"type": "error", "error": str(exc)})
        except Exception as exc:
            logger.exception("Chat failed")
            yield _sse_event({"type": "error", "error": format_ollama_error(exc)})

    return StreamingResponse(token_stream(), media_type="text/event-stream")


@app.get("/collection/{name}/sources", response_model=CollectionSourcesResponse)
def list_collection_sources(name: str) -> CollectionSourcesResponse:
    try:
        sources = get_ingestor().list_sources(name)
        return CollectionSourcesResponse(sources=sources)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to list collection sources")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/collection/{name}/sources", response_model=DeleteSourceResponse)
def delete_collection_source(name: str, request: DeleteSourceRequest) -> DeleteSourceResponse:
    try:
        removed = get_ingestor().delete_source(name, request.source_path)
        if removed == 0:
            raise HTTPException(status_code=404, detail="Source not found in collection")
        return DeleteSourceResponse(deleted=True, chunks_removed=removed)
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to delete source")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/collection/{name}/preview", response_model=SourcePreviewResponse)
def preview_collection_source(name: str, source_path: str) -> SourcePreviewResponse:
    if not source_path.strip():
        raise HTTPException(status_code=400, detail="source_path is required")
    try:
        if not get_ingestor().source_in_collection(name, source_path):
            raise HTTPException(status_code=404, detail="Source not found in collection")
        preview = get_ingestor().preview_source(source_path, name)
        return SourcePreviewResponse(**preview)
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to preview source")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/collection/{name}", response_model=DeleteCollectionResponse)
def delete_collection(name: str) -> DeleteCollectionResponse:
    try:
        deleted = get_ingestor().delete_collection(name)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Collection not found: {name}")
        return DeleteCollectionResponse(deleted=True, name=name)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to delete collection")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def _validate_ollama_cli() -> None:
    if shutil.which("ollama") is None and platform.system() == "Windows":
        logger.warning(
            "Ollama binary not in PATH. Windows users can install from "
            "https://ollama.com/download/windows"
        )


if __name__ == "__main__" or getattr(sys, "frozen", False):
    # Publish the port before Uvicorn loads the app so the desktop shell can connect immediately.
    BACKEND_PORT = resolve_backend_port()
    _validate_ollama_cli()
    timeout_keep_alive = 120 if platform.system() == "Windows" else 75
    uvicorn.run(
        app,
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=False,
        timeout_keep_alive=timeout_keep_alive,
        log_level="info",
    )
