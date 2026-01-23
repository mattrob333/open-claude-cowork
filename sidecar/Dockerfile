# Docling Sidecar - Document Processing Service
# FastAPI service for parsing documents using Docling

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY docling_service/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY docling_service/ ./docling_service/

# Create non-root user
RUN useradd -m -u 1001 appuser && \
    mkdir -p /app/cache && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

# Start the service
CMD ["python", "-m", "uvicorn", "docling_service.main:app", "--host", "0.0.0.0", "--port", "8765"]
