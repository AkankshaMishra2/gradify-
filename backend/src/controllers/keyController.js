import AnswerKey from '../models/AnswerKey.js';
import { extractTextFromFile, parseQAFromText, scoreTextConfidence } from '../utils/ocr.js';

export const uploadKey = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const text = await extractTextFromFile(file.path);
    const questions = parseQAFromText(text);
    const confidence = scoreTextConfidence(text);
    if (!questions.length) {
      return res.status(400).json({ error: 'No questions parsed from key', hint: 'Check OCR raw text for formatting and ensure questions start with Qn or n).' , rawText: text, confidence });
    }
    const key = await AnswerKey.create({ title: file.originalname, filePath: file.path, questions, createdBy: req.user?.id });
    return res.json({ keyId: key._id, count: questions.length, rawText: text, confidence });
  } catch (err) {
    return res.status(500).json({ error: 'Upload key failed', message: err.message });
  }
};
