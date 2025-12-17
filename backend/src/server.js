import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import keyRoutes from './routes/keyRoutes.js';
import sheetRoutes from './routes/sheetRoutes.js';
import evalRoutes from './routes/evalRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import rateLimiter from './middleware/rateLimit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global error handling to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  // Keep the process alive for a moment to log, but usually we should exit. 
  // On Render, exiting will restart the service.
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error(err.name, err.message);
});

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://gradify-2.onrender.com", "http://localhost:5000", "https://gradify-d7dt.vercel.app"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
	origin: true, // Allow all origins temporarily for debugging
	credentials: true,
}));
app.options('*', cors()); // Enable pre-flight for all routes

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));

connectDB();

const useLimiter = process.env.NODE_ENV !== 'development';
app.use('/auth', useLimiter ? rateLimiter : (req, res, next) => next(), authRoutes);
app.use('/api', useLimiter ? rateLimiter : (req, res, next) => next(), keyRoutes);
app.use('/api', useLimiter ? rateLimiter : (req, res, next) => next(), sheetRoutes);
app.use('/api', useLimiter ? rateLimiter : (req, res, next) => next(), evalRoutes);
app.use('/api', useLimiter ? rateLimiter : (req, res, next) => next(), studentRoutes);
app.use('/api', useLimiter ? rateLimiter : (req, res, next) => next(), exportRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

// Serve static files from the React app
const distPath = path.join(process.cwd(), 'dist');
console.log('Static files path:', distPath);
if (fs.existsSync(distPath)) {
    console.log('Dist directory exists');
} else {
    console.error('Dist directory MISSING at', distPath);
}

app.use(express.static(distPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
  } else {
      console.error('Index.html missing at', indexPath);
      res.status(404).send('Application not found (index.html missing)');
  }
});

// Centralized error handler so Multer and other middleware surface clean responses
app.use((err, req, res, next) => {
    console.error('ERROR MIDDLEWARE CAUGHT:', err);
	if (!err) return next();
	if (err instanceof multer.MulterError) {
		return res.status(400).json({ error: `Upload Error: ${err.message}` });
	}
	if (err.message) {
		return res.status(400).json({ error: err.message });
	}
	return res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Gradify backend running on port ${PORT}`));
