import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { listStudents, getStudent, deleteStudent } from '../controllers/studentController.js';

const router = express.Router();
router.get('/students', authMiddleware, listStudents);
router.get('/students/:id', authMiddleware, getStudent);
router.delete('/students/:id', authMiddleware, deleteStudent);
export default router;
