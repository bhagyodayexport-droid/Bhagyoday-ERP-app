import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";

// Import custom routes and middleware
import { initAdmin } from "./server/lib/firebaseAdmin";
import whatsappRoutes from "./server/routes/whatsappRoutes";
import quotationRoutes from "./server/routes/quotationRoutes";
import { errorHandler, loggerMiddleware } from "./server/middleware/errorMiddleware";
import { logger } from "./server/lib/logger";
import { whatsappWorker } from "./server/lib/queue";
import { verifyToken } from "./server/middleware/authMiddleware";
import { rateLimitByUser } from "./server/middleware/rateLimitByUser";

async function startServer() {
  // Initialize Firebase Admin (Safe initialization)
  initAdmin();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust proxy for rate limiting (essential in proxy environments)
  app.set('trust proxy', 1);

  // Rate Limiting (Hardened for Production)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 100, 
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { success: false, message: "Too many requests from this IP" }
  });

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));

  // Vite middleware for development (Moved up to avoid logging asset requests)
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to avoid ESM requirement in production bundle
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.use(morgan("dev"));
  app.use(loggerMiddleware); // Custom structured logger

  // --- API VERSIONING ---
  const v1Router = express.Router();
  
  // V1 Health Check
  v1Router.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      version: "v1",
      timestamp: new Date().toISOString()
    });
  });

  // V1 Routes
  v1Router.use(verifyToken);
  v1Router.use(rateLimitByUser);
  v1Router.use("/whatsapp", whatsappRoutes);
  v1Router.use("/quotations", quotationRoutes);

  // Mount V1
  app.use("/api/v1", limiter, v1Router);

  // Legacy API Support (with Deprecation Headers)
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith('/v1')) return next();
    
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
    next();
  }, limiter);

  // Legacy & Root Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "deprecated", 
      message: "Please use /api/v1/health",
      env: process.env.NODE_ENV
    });
  });

  // Production static files (Vite handled dev mode above)
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 ERP Backend Running on http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
