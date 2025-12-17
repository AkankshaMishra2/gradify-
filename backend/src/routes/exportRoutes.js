import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { exportCsv } from '../controllers/exportController.js';

const router = express.Router();
router.get('/export-csv', authMiddleware, exportCsv);
export default router;
