"""Pydantic request and response models."""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    models: List[str]
    platform: str
    port: int


class CollectionInfo(BaseModel):
    name: str
    document_count: int


class CollectionsResponse(BaseModel):
    collections: List[CollectionInfo]


class IngestRequest(BaseModel):
    folder_path: str = Field(..., min_length=1)
    collection_name: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    collection_name: str = Field(..., min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=20)
    response_mode: Literal["default", "search", "think", "sources"] = "default"


class DeleteCollectionResponse(BaseModel):
    deleted: bool
    name: str


class SourceInfo(BaseModel):
    path: str
    file_name: str
    file_type: str
    chunk_count: int


class CollectionSourcesResponse(BaseModel):
    sources: List[SourceInfo]


class DeleteSourceRequest(BaseModel):
    source_path: str = Field(..., min_length=1)


class DeleteSourceResponse(BaseModel):
    deleted: bool
    chunks_removed: int


class SourcePreviewResponse(BaseModel):
    kind: Literal["text", "pdf", "unavailable"]
    file_name: str
    content: str | None = None
    content_base64: str | None = None
    preview_note: str | None = None
    message: str | None = None


class OllamaStatusResponse(BaseModel):
    installed: bool
    running: bool
    models: List[str]
    required_models: List[str]
    missing_models: List[str]
    ready: bool
    install_url: str
    platform: str
    error: str | None = None


class OllamaPullRequest(BaseModel):
    models: List[str] | None = None


class ErrorResponse(BaseModel):
    detail: str
