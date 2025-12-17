import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { evaluate, getLatestEvaluationByStudent } from '../controllers/evalController.js';

const router = express.Router();
router.post('/evaluate', authMiddleware, evaluate);
router.get('/evaluations/:studentId', authMiddleware, getLatestEvaluationByStudent);
export default router;
