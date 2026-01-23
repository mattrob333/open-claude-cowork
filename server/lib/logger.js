import pino from 'pino';
import crypto from 'crypto';

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

// Configure pino with pretty printing in dev
const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname'
      }
    }
  : undefined;

const baseLogger = pino({
  level: logLevel,
  transport,
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

// Generate a short request ID
function generateRequestId() {
  return crypto.randomBytes(4).toString('hex');
}

// Create a child logger with request context
function createRequestLogger(req) {
  const requestId = req?.headers?.['x-request-id'] || generateRequestId();
  return baseLogger.child({
    requestId,
    method: req?.method,
    path: req?.path
  });
}

// Express middleware for request logging
function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now();
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  req.log = baseLogger.child({ requestId: req.requestId });

  // Log request start
  req.log.info({ method: req.method, path: req.path }, 'Request started');

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.log.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      },
      'Request completed'
    );
  });

  next();
}

// Named loggers for different modules
const logger = {
  base: baseLogger,
  chat: baseLogger.child({ module: 'chat' }),
  composio: baseLogger.child({ module: 'composio' }),
  workflow: baseLogger.child({ module: 'workflow' }),
  provider: baseLogger.child({ module: 'provider' }),
  server: baseLogger.child({ module: 'server' }),
  cors: baseLogger.child({ module: 'cors' }),

  // Helper to create request-scoped logger
  forRequest: createRequestLogger,

  // Express middleware
  middleware: requestLoggerMiddleware,

  // Convenience methods on base logger
  info: (...args) => baseLogger.info(...args),
  error: (...args) => baseLogger.error(...args),
  warn: (...args) => baseLogger.warn(...args),
  debug: (...args) => baseLogger.debug(...args)
};

export default logger;
export { requestLoggerMiddleware, createRequestLogger };
