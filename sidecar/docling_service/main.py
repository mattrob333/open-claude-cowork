"""
Docling Sidecar Service

A FastAPI service for document parsing and processing using Docling.
Handles PDF, Word, and other document formats.
"""

import asyncio
import logging
import os
import tempfile
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("docling_service")

# Initialize FastAPI app
app = FastAPI(
    title="Docling Sidecar Service",
    description="Document parsing and processing service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Models ===

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ParseRequest(BaseModel):
    """Request model for document parsing"""
    document_id: Optional[str] = Field(default=None, description="Optional document ID")
    extract_tables: bool = Field(default=True, description="Extract tables from document")
    extract_images: bool = Field(default=False, description="Extract images from document")
    chunk_size: int = Field(default=1000, description="Target chunk size in characters")


class DocumentChunk(BaseModel):
    """A chunk of parsed document content"""
    id: str
    content: str
    page: Optional[int] = None
    metadata: dict = Field(default_factory=dict)


class ParseResult(BaseModel):
    """Result of document parsing"""
    document_id: str
    status: DocumentStatus
    chunks: list[DocumentChunk] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    error: Optional[str] = None
    processing_time_ms: Optional[int] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    docling_available: bool


# === In-memory storage (replace with database in production) ===

processing_jobs: dict[str, ParseResult] = {}


# === Document parsing logic ===

async def parse_document_content(
    file_path: Path,
    document_id: str,
    options: ParseRequest
) -> ParseResult:
    """
    Parse a document using Docling and return structured content.
    """
    start_time = datetime.now()

    try:
        # Try to import docling
        try:
            from docling.document_converter import DocumentConverter
        except ImportError:
            logger.warning("Docling not available, using fallback parser")
            # Fallback: simple text extraction
            return await fallback_parse(file_path, document_id, options, start_time)

        # Use Docling for parsing
        converter = DocumentConverter()
        result = converter.convert(str(file_path))

        # Extract content as chunks
        chunks = []
        full_text = result.document.export_to_markdown()

        # Simple chunking by character count
        chunk_size = options.chunk_size
        for i, start in enumerate(range(0, len(full_text), chunk_size)):
            chunk_text = full_text[start:start + chunk_size]
            chunks.append(DocumentChunk(
                id=f"{document_id}_chunk_{i}",
                content=chunk_text,
                metadata={"chunk_index": i}
            ))

        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        return ParseResult(
            document_id=document_id,
            status=DocumentStatus.COMPLETED,
            chunks=chunks,
            metadata={
                "pages": len(result.pages) if hasattr(result, 'pages') else None,
                "total_chunks": len(chunks),
                "file_path": str(file_path)
            },
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Error parsing document {document_id}: {e}")
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        return ParseResult(
            document_id=document_id,
            status=DocumentStatus.FAILED,
            error=str(e),
            processing_time_ms=processing_time
        )


async def fallback_parse(
    file_path: Path,
    document_id: str,
    options: ParseRequest,
    start_time: datetime
) -> ParseResult:
    """
    Fallback parser for when Docling is not available.
    Handles basic text extraction.
    """
    try:
        suffix = file_path.suffix.lower()
        content = ""

        if suffix in ['.txt', '.md']:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
        else:
            # For binary files, just note that we need docling
            content = f"[Document parsing requires Docling for {suffix} files]"

        # Chunk the content
        chunks = []
        chunk_size = options.chunk_size
        for i, start in enumerate(range(0, len(content), chunk_size)):
            chunk_text = content[start:start + chunk_size]
            chunks.append(DocumentChunk(
                id=f"{document_id}_chunk_{i}",
                content=chunk_text,
                metadata={"chunk_index": i}
            ))

        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        return ParseResult(
            document_id=document_id,
            status=DocumentStatus.COMPLETED,
            chunks=chunks,
            metadata={
                "total_chunks": len(chunks),
                "fallback_mode": True
            },
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Fallback parser error: {e}")
        return ParseResult(
            document_id=document_id,
            status=DocumentStatus.FAILED,
            error=str(e)
        )


# === API Endpoints ===

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    docling_available = False
    try:
        from docling.document_converter import DocumentConverter
        docling_available = True
    except ImportError:
        pass

    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        docling_available=docling_available
    )


@app.post("/parse/sync", response_model=ParseResult)
async def parse_document_sync(
    file: UploadFile = File(...),
    extract_tables: bool = True,
    extract_images: bool = False,
    chunk_size: int = 1000
):
    """
    Parse a document synchronously.
    Blocks until parsing is complete.
    """
    document_id = str(uuid.uuid4())

    # Validate file type
    allowed_types = {'.pdf', '.docx', '.doc', '.txt', '.md', '.json', '.csv'}
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: {', '.join(allowed_types)}"
        )

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        options = ParseRequest(
            document_id=document_id,
            extract_tables=extract_tables,
            extract_images=extract_images,
            chunk_size=chunk_size
        )
        result = await parse_document_content(tmp_path, document_id, options)
        return result
    finally:
        # Cleanup temp file
        if tmp_path.exists():
            tmp_path.unlink()


@app.post("/parse/async", response_model=dict)
async def parse_document_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    extract_tables: bool = True,
    extract_images: bool = False,
    chunk_size: int = 1000
):
    """
    Start asynchronous document parsing.
    Returns immediately with a job ID to poll.
    """
    document_id = str(uuid.uuid4())

    # Validate file type
    allowed_types = {'.pdf', '.docx', '.doc', '.txt', '.md', '.json', '.csv'}
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: {', '.join(allowed_types)}"
        )

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    # Initialize job status
    processing_jobs[document_id] = ParseResult(
        document_id=document_id,
        status=DocumentStatus.PENDING
    )

    # Run parsing in background
    async def process_job():
        try:
            processing_jobs[document_id].status = DocumentStatus.PROCESSING
            options = ParseRequest(
                document_id=document_id,
                extract_tables=extract_tables,
                extract_images=extract_images,
                chunk_size=chunk_size
            )
            result = await parse_document_content(tmp_path, document_id, options)
            processing_jobs[document_id] = result
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    background_tasks.add_task(process_job)

    return {
        "document_id": document_id,
        "status": "processing",
        "poll_url": f"/parse/status/{document_id}"
    }


@app.get("/parse/status/{document_id}", response_model=ParseResult)
async def get_parse_status(document_id: str):
    """Get the status of an async parsing job"""
    if document_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Document not found")
    return processing_jobs[document_id]


@app.delete("/parse/job/{document_id}")
async def delete_job(document_id: str):
    """Delete a completed parsing job from memory"""
    if document_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Document not found")
    del processing_jobs[document_id]
    return {"status": "deleted", "document_id": document_id}


# === Main entry point ===

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8765"))
    host = os.getenv("HOST", "127.0.0.1")

    logger.info(f"Starting Docling sidecar on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
