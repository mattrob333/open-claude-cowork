/**
 * Docling Client with Circuit Breaker
 *
 * Resilient client for communicating with the Docling sidecar service.
 * Implements circuit breaker pattern to prevent cascading failures.
 */

import logger from './logger.js';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Circuit breaker states
const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation, requests flow through
  OPEN: 'OPEN',         // Failing, reject requests immediately
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 30000; // 30 seconds
    this.halfOpenRequests = options.halfOpenRequests || 1;

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenCount = 0;
  }

  async execute(fn) {
    if (this.state === CircuitState.OPEN) {
      // Check if recovery timeout has passed
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCount = 0;
        logger.base.info({ state: this.state }, 'Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is OPEN - request rejected');
      }
    }

    if (this.state === CircuitState.HALF_OPEN && this.halfOpenCount >= this.halfOpenRequests) {
      throw new Error('Circuit breaker is HALF_OPEN - waiting for test requests to complete');
    }

    try {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenCount++;
      }

      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        logger.base.info({ state: this.state }, 'Circuit breaker recovered - now CLOSED');
      }
    } else {
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successes = 0;
      logger.base.warn({ state: this.state }, 'Circuit breaker re-opened from half-open');
    } else if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.base.warn({ state: this.state, failures: this.failures }, 'Circuit breaker opened');
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Docling Client
 */
class DoclingClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.DOCLING_URL || 'http://127.0.0.1:8765';
    this.timeout = options.timeout || 60000; // 60 second default timeout
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 30000
    });

    this.log = logger.base.child({ module: 'docling-client' });
  }

  /**
   * Make a request to the Docling service
   */
  async request(path, options = {}) {
    return this.circuitBreaker.execute(async () => {
      const url = `${this.baseUrl}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Docling service error: ${response.status} - ${error}`);
        }

        return response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  /**
   * Check service health
   */
  async health() {
    try {
      const result = await this.request('/health');
      return {
        healthy: result.status === 'healthy',
        ...result
      };
    } catch (error) {
      this.log.error({ error: error.message }, 'Health check failed');
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Parse a document synchronously
   * @param {Buffer} fileBuffer - The file content
   * @param {string} filename - Original filename
   * @param {Object} options - Parsing options
   */
  async parseSync(fileBuffer, filename, options = {}) {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename });

    // Build query params
    const params = new URLSearchParams();
    if (options.extractTables !== undefined) params.append('extract_tables', options.extractTables);
    if (options.extractImages !== undefined) params.append('extract_images', options.extractImages);
    if (options.chunkSize !== undefined) params.append('chunk_size', options.chunkSize);

    const queryString = params.toString();
    const url = `/parse/sync${queryString ? '?' + queryString : ''}`;

    this.log.info({ filename, options }, 'Starting sync parse');

    const result = await this.request(url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    this.log.info({
      documentId: result.document_id,
      status: result.status,
      chunks: result.chunks?.length || 0,
      processingTimeMs: result.processing_time_ms
    }, 'Sync parse completed');

    return result;
  }

  /**
   * Start async document parsing
   * @param {Buffer} fileBuffer - The file content
   * @param {string} filename - Original filename
   * @param {Object} options - Parsing options
   */
  async parseAsync(fileBuffer, filename, options = {}) {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename });

    const params = new URLSearchParams();
    if (options.extractTables !== undefined) params.append('extract_tables', options.extractTables);
    if (options.extractImages !== undefined) params.append('extract_images', options.extractImages);
    if (options.chunkSize !== undefined) params.append('chunk_size', options.chunkSize);

    const queryString = params.toString();
    const url = `/parse/async${queryString ? '?' + queryString : ''}`;

    this.log.info({ filename, options }, 'Starting async parse');

    return this.request(url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
  }

  /**
   * Get status of an async parsing job
   * @param {string} documentId - The document ID
   */
  async getStatus(documentId) {
    return this.request(`/parse/status/${documentId}`);
  }

  /**
   * Poll for async job completion
   * @param {string} documentId - The document ID
   * @param {Object} options - Polling options
   */
  async waitForCompletion(documentId, options = {}) {
    const pollInterval = options.pollInterval || 1000;
    const maxAttempts = options.maxAttempts || 60;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getStatus(documentId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Polling timeout after ${maxAttempts} attempts`);
  }

  /**
   * Delete a completed job
   * @param {string} documentId - The document ID
   */
  async deleteJob(documentId) {
    return this.request(`/parse/job/${documentId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState() {
    return this.circuitBreaker.getState();
  }
}

// Export singleton instance and class
const defaultClient = new DoclingClient();

export default defaultClient;
export { DoclingClient, CircuitBreaker, CircuitState };
