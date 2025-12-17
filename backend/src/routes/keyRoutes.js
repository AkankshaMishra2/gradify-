import express from 'express';
import { upload } from '../middleware/upload.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadKey } from '../controllers/keyController.js';

const router = express.Router();
router.post('/upload-key', authMiddleware, upload.single('file'), uploadKey);
export default router;
