import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 1000 : 200));

const limiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

export default limiter;
