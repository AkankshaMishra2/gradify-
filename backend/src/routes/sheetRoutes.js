import express from 'express';
import { upload } from '../middleware/upload.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadSheet, uploadAndEvaluate } from '../controllers/sheetController.js';

const router = express.Router();
router.post('/upload-sheet', authMiddleware, upload.array('files', 50), uploadSheet);
router.post('/upload-and-evaluate', authMiddleware, upload.array('files', 50), uploadAndEvaluate);
export default router;
