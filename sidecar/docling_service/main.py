"""
Docling Sidecar Service
FastAPI service for document parsing using Docling library
"""

import os
import tempfile
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="Docling Sidecar",
    description="Document processing service for Open Claude Cowork",
    version="1.0.0"
)


class HealthResponse(BaseModel):
    status: str
    version: str


class ParseResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    pages: Optional[int] = None
    error: Optional[str] = None


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="ok", version="1.0.0")


@app.post("/parse/sync", response_model=ParseResponse)
async def parse_document(file: UploadFile = File(...)):
    """
    Parse a document synchronously and return extracted text.
    Supports PDF, DOCX, PPTX, and other document formats.
    """
    try:
        # Import docling here to defer heavy import
        from docling.document_converter import DocumentConverter

        # Save uploaded file to temp location
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # Parse with Docling
            converter = DocumentConverter()
            result = converter.convert(tmp_path)

            # Extract text from result
            text = result.document.export_to_markdown()
            pages = len(result.document.pages) if hasattr(result.document, 'pages') else None

            return ParseResponse(
                success=True,
                text=text,
                pages=pages
            )
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except ImportError:
        return ParseResponse(
            success=False,
            error="Docling library not available"
        )
    except Exception as e:
        return ParseResponse(
            success=False,
            error=str(e)
        )


@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Docling Sidecar",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "parse": "/parse/sync"
        }
    }
