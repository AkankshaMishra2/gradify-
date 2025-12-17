import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
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

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);
		if (allowedOrigins.length === 0) return callback(null, true);
		if (allowedOrigins.includes(origin)) return callback(null, true);
		return callback(new Error('Not allowed by CORS'));
	},
	credentials: true,
}));
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
app.use(express.static(path.join(__dirname, '../../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Centralized error handler so Multer and other middleware surface clean responses
app.use((err, req, res, next) => {
	if (!err) return next();
	if (err instanceof multer.MulterError) {
		return res.status(400).json({ error: err.message });
	}
	if (err.message) {
		return res.status(400).json({ error: err.message });
	}
	return res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Gradify backend running on port ${PORT}`));
