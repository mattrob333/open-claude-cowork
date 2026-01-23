/**
 * Sidecar Process Manager
 *
 * Manages the lifecycle of the Docling Python sidecar service.
 * Handles automatic startup, health monitoring, and restart on failure.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import doclingClient from './docling-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_CONFIG = {
  pythonPath: process.env.PYTHON_PATH || 'python',
  sidecarPath: path.join(__dirname, '..', '..', 'sidecar', 'docling_service', 'main.py'),
  port: parseInt(process.env.DOCLING_PORT || '8765', 10),
  host: process.env.DOCLING_HOST || '127.0.0.1',
  healthCheckInterval: 30000,      // 30 seconds
  startupTimeout: 30000,           // 30 seconds to start
  restartDelay: 5000,              // 5 seconds before restart
  maxRestarts: 3,                  // Max restarts within window
  restartWindow: 60000,            // 1 minute window for restart counting
  autoStart: true
};

class SidecarManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.process = null;
    this.isRunning = false;
    this.restartCount = 0;
    this.lastRestartTime = null;
    this.healthCheckTimer = null;
    this.startupPromise = null;

    this.log = logger.base.child({ module: 'sidecar-manager' });
  }

  /**
   * Start the sidecar process
   */
  async start() {
    if (this.isRunning) {
      this.log.warn('Sidecar already running');
      return;
    }

    // Check restart limits
    if (this.shouldThrottle()) {
      this.log.error({
        restartCount: this.restartCount,
        maxRestarts: this.config.maxRestarts
      }, 'Restart throttled - too many restarts');
      throw new Error('Sidecar restart throttled due to excessive failures');
    }

    this.log.info({ config: this.config }, 'Starting sidecar process');

    return new Promise((resolve, reject) => {
      const args = [
        this.config.sidecarPath,
        '--host', this.config.host,
        '--port', String(this.config.port)
      ];

      this.process = spawn(this.config.pythonPath, args, {
        env: {
          ...process.env,
          PORT: String(this.config.port),
          HOST: this.config.host
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
          this.log.debug({ output: line }, 'Sidecar stdout');
        });
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
          this.log.warn({ output: line }, 'Sidecar stderr');
        });
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        this.isRunning = false;
        this.log.warn({ code, signal }, 'Sidecar process exited');
        this.stopHealthCheck();

        // Auto-restart if not intentionally stopped
        if (this.config.autoStart && !this.intentionalStop) {
          this.scheduleRestart();
        }
      });

      // Handle process error
      this.process.on('error', (error) => {
        this.isRunning = false;
        this.log.error({ error: error.message }, 'Sidecar process error');
        reject(error);
      });

      // Wait for health check to pass
      this.waitForHealthy()
        .then(() => {
          this.isRunning = true;
          this.startHealthCheck();
          resolve();
        })
        .catch((error) => {
          this.stop();
          reject(error);
        });
    });
  }

  /**
   * Wait for the sidecar to become healthy
   */
  async waitForHealthy() {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < this.config.startupTimeout) {
      try {
        const health = await doclingClient.health();
        if (health.healthy) {
          this.log.info('Sidecar is healthy');
          return;
        }
      } catch (error) {
        // Expected during startup
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Sidecar failed to become healthy within ${this.config.startupTimeout}ms`);
  }

  /**
   * Stop the sidecar process
   */
  async stop() {
    this.intentionalStop = true;
    this.stopHealthCheck();

    if (!this.process) {
      return;
    }

    this.log.info('Stopping sidecar process');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log.warn('Sidecar did not exit gracefully, killing');
        this.process.kill('SIGKILL');
      }, 5000);

      this.process.on('exit', () => {
        clearTimeout(timeout);
        this.isRunning = false;
        this.process = null;
        this.intentionalStop = false;
        resolve();
      });

      this.process.kill('SIGTERM');
    });
  }

  /**
   * Restart the sidecar process
   */
  async restart() {
    this.log.info('Restarting sidecar');
    await this.stop();
    this.recordRestart();
    await this.start();
  }

  /**
   * Check if restarts should be throttled
   */
  shouldThrottle() {
    if (!this.lastRestartTime) return false;

    const timeSinceLastRestart = Date.now() - this.lastRestartTime;
    if (timeSinceLastRestart > this.config.restartWindow) {
      // Reset counter if outside window
      this.restartCount = 0;
      return false;
    }

    return this.restartCount >= this.config.maxRestarts;
  }

  /**
   * Record a restart attempt
   */
  recordRestart() {
    const now = Date.now();
    if (this.lastRestartTime && now - this.lastRestartTime > this.config.restartWindow) {
      this.restartCount = 0;
    }
    this.restartCount++;
    this.lastRestartTime = now;
  }

  /**
   * Schedule an automatic restart
   */
  scheduleRestart() {
    this.log.info({ delay: this.config.restartDelay }, 'Scheduling sidecar restart');

    setTimeout(async () => {
      try {
        this.recordRestart();
        await this.start();
        this.log.info('Sidecar restarted successfully');
      } catch (error) {
        this.log.error({ error: error.message }, 'Failed to restart sidecar');
      }
    }, this.config.restartDelay);
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await doclingClient.health();
        if (!health.healthy) {
          this.log.warn('Sidecar health check failed');
          this.scheduleRestart();
        }
      } catch (error) {
        this.log.error({ error: error.message }, 'Sidecar health check error');
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.isRunning,
      pid: this.process?.pid || null,
      restartCount: this.restartCount,
      lastRestartTime: this.lastRestartTime,
      config: {
        port: this.config.port,
        host: this.config.host
      }
    };
  }
}

// Export singleton instance and class
const sidecarManager = new SidecarManager();

export default sidecarManager;
export { SidecarManager };
