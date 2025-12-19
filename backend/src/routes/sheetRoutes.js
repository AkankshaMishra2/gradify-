import express from 'express';
import { upload } from '../middleware/upload.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadSheet, uploadAndEvaluate, uploadAndEvaluateBatch } from '../controllers/sheetController.js';

const router = express.Router();
router.post('/upload-sheet', authMiddleware, upload.array('files', 50), uploadSheet);
router.post('/upload-and-evaluate', authMiddleware, upload.array('files', 50), uploadAndEvaluate);
router.post('/upload-and-evaluate-batch', authMiddleware, upload.array('files', 200), uploadAndEvaluateBatch);
export default router;
