import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logger } from "./logger";

const app = express();
const httpServer = createServer(app);

// Request ID Middleware
app.use((req, res, next) => {
  const reqId = req.headers["x-request-id"] || uuidv4();
  req.headers["x-request-id"] = reqId;
  res.setHeader("X-Request-ID", reqId);
  next();
});

// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://*"],
    },
  } : false, // Disable CSP in dev to avoid Vite HMR issues
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",") 
  : (process.env.NODE_ENV === "production" ? [] : ["http://localhost:5000"]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === "production") {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// API Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please try again later." } }
});
app.use("/api/", globalLimiter);

// Stricter rate limit for expensive AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 chat requests per window
  message: { success: false, error: { code: "AI_RATE_LIMIT_EXCEEDED", message: "Too many AI queries, please try again later." } }
});
app.use("/api/chat", aiLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "1mb", // Prevent large payload attacks
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const reqId = req.headers["x-request-id"];
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Do not log full response in production to avoid leaking PII/secrets
      if (process.env.NODE_ENV !== "production" && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (res.statusCode >= 400) {
        logger.warn(logLine, { reqId, method: req.method, path, statusCode: res.statusCode, duration });
      } else {
        logger.info(logLine, { reqId, method: req.method, path, statusCode: res.statusCode, duration });
      }
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const reqId = req.headers["x-request-id"];
    
    // Log the full technical error internally
    logger.error("Internal Server Error", { 
      reqId,
      error: err.message, 
      stack: err.stack,
      path: req.path
    });

    if (res.headersSent) {
      return next(err);
    }

    // Abstract the error for the client in production
    const clientMessage = (process.env.NODE_ENV === "production" && status === 500) 
      ? "An unexpected error occurred. Please try again." 
      : err.message || "Internal Server Error";

    return res.status(status).json({ 
      success: false, 
      error: { 
        code: status === 500 ? "INTERNAL_ERROR" : "BAD_REQUEST", 
        message: clientMessage 
      } 
    });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    logger.info(`Server serving on port ${port}`, { port });
  });

  // Graceful Shutdown implementation
  const gracefulShutdown = () => {
    logger.info("Received shutdown signal, initiating graceful shutdown...");
    httpServer.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
})();
