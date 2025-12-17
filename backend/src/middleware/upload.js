import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx']);
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.has(ext)) return cb(null, true);
  return cb(new Error('Only PDF, PNG, JPG, JPEG, DOC, DOCX files allowed'));
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
