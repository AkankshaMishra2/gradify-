import { extractTextFromFile, parseStudentAnswers, scoreTextConfidence } from '../utils/ocr.js';
import AnswerKey from '../models/AnswerKey.js';
import Student from '../models/Student.js';
import EvaluationRecord from '../models/EvaluationRecord.js';
import { evaluateExam } from '../utils/evaluator.js';
import fs from 'fs';
import path from 'path';

const mapWithConcurrency = async (items, limit, iterator) => {
  if (!Array.isArray(items) || !items.length) return [];
  const results = new Array(items.length);
  let idx = 0;
  const next = () => (idx < items.length ? idx++ : null);
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = next();
      if (current === null) break;
      results[current] = await iterator(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
};

const collectUploadedFiles = (req) => {
  if (Array.isArray(req.files) && req.files.length) return req.files;
  if (req.file) return [req.file];
  return [];
};

export const uploadSheet = async (req, res) => {
  console.log('[Upload] Received upload request');
  try {
    const files = collectUploadedFiles(req);
    console.log(`[Upload] Processing ${files.length} files`);
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const pageSummaries = await mapWithConcurrency(files, 3, async (f, idx) => {
      console.log(`[Upload] Extracting text from file ${idx + 1}: ${f.originalname}`);
      const extracted = await extractTextFromFile(f.path);
      console.log(`[Upload] Extraction complete for file ${idx + 1}`);
      const raw = (extracted || '').trim();
      return {
        index: idx + 1,
        fileName: f.originalname || path.basename(f.path),
        rawText: raw,
        confidence: scoreTextConfidence(raw),
      };
    });

    const combinedText = pageSummaries
      .map((p) => p?.rawText || '')
      .filter(Boolean)
      .join('\n\n');

    const answers = parseStudentAnswers(combinedText);
    const confidence = scoreTextConfidence(combinedText);

    return res.json({ answers, rawText: combinedText, confidence, pages: pageSummaries });
  } catch (err) {
    return res.status(500).json({ error: 'Upload sheet failed', message: err.message });
  }
};

export const uploadAndEvaluate = async (req, res) => {
  try {
    const files = collectUploadedFiles(req);
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const { studentName, rollNumber, keyId } = req.body;
    if (!studentName || !rollNumber) {
      return res.status(400).json({ error: 'Student name and roll number are required' });
    }
    if (!keyId) {
      return res.status(400).json({ error: 'Answer key ID is required' });
    }

    const pageSummaries = await mapWithConcurrency(files, 3, async (f, idx) => {
      const extracted = await extractTextFromFile(f.path);
      const raw = (extracted || '').trim();
      return {
        index: idx + 1,
        fileName: f.originalname || path.basename(f.path),
        rawText: raw,
        confidence: scoreTextConfidence(raw),
      };
    });

    const text = pageSummaries
      .map((p) => p?.rawText || '')
      .filter(Boolean)
      .join('\n\n');
    const answers = parseStudentAnswers(text);
    const ocrConfidence = scoreTextConfidence(text);

    if (!answers.length) {
      return res.status(400).json({
        error: 'No answers parsed from sheet',
        hint: 'Check OCR raw text for formatting',
        rawText: text,
        confidence: ocrConfidence,
      });
    }

    const key = await AnswerKey.findById(keyId);
    if (!key) return res.status(404).json({ error: 'Answer key not found' });

    const normalizeQ = (n) => String(n || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^q/, '');

    const answersWithMeta = answers.map((ans, idx) => ({
      index: idx,
      number: String(ans.number || ''),
      label: ans.label || ans.number || `Q${idx + 1}`,
      normalized: normalizeQ(ans.number || ans.label || ''),
      answer: String(ans.answer || ''),
      pageIndex: ans.pageIndex ?? ans.page ?? null,
    }));

    const evaluation = await evaluateExam({
      answerKey: key.questions,
      studentAnswers: answersWithMeta,
    });

    const evalDetails = evaluation.details || [];
    const total = Number(evaluation.totalScore || 0);
    const overallFeedback = evaluation.overallFeedback || 'Review the provided solutions to strengthen weak concepts.';
    const weakAreas = evaluation.weakAreas || [];
    const mappingDetails = evaluation.mappingDetails || [];
    const overallConfidence = Number(evaluation.overallConfidence || 0);

    const examinerEvaluation = evaluation.examinerJson?.evaluation || Object.fromEntries(
      evalDetails.map((d) => [
        `Q${d.number}`,
        {
          question: d.question,
          expectedAnswer: key.questions.find((kq) => String(kq.number) === String(d.number))?.correctAnswer || '',
          studentAnswer: d.mappedStudentAnswerText || '',
          maxMarks: d.maxMarks,
          scoreAwarded: d.score,
          percentage: d.percentage,
          conceptMatch: d.conceptMatch,
          missingPoints: d.missingPoints,
          reason: d.reason,
          mappingConfidence: d.mappingConfidence,
          mappedStudentAnswerLabel: d.mappedStudentAnswerLabel || null,
        },
      ])
    );

    const examinerJson = evaluation.examinerJson || {
      evaluation: examinerEvaluation,
      totalScore: total,
      overallFeedback,
      weakAreas,
      overallConfidence,
      mappingDetails,
    };

    const student = await Student.create({
      name: studentName,
      rollNumber: rollNumber,
      extractedAnswers: answers,
      evaluatedMarks: evalDetails.map((d) => ({
        number: d.number,
        answer: d.mappedStudentAnswerText || '',
        score: d.score,
        maxMarks: d.maxMarks,
        percentage: d.percentage,
        conceptMatch: d.conceptMatch,
        missingPoints: d.missingPoints,
        reason: d.reason,
        mappingConfidence: d.mappingConfidence,
        confidence: d.confidence,
        mappedStudentAnswerLabel: d.mappedStudentAnswerLabel || null,
      })),
      totalScore: total,
      status: 'evaluated',
    });

    const record = await EvaluationRecord.create({
      student: student._id,
      answerKey: key._id,
      evaluatorModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      details: evalDetails,
      totalScore: total,
      overallConfidence,
      weakAreas,
      mappingDetails,
    });

    try {
      const dir = path.join(process.cwd(), 'storage', 'evaluations');
      fs.mkdirSync(dir, { recursive: true });
      const fname = `${String(student._id)}-${Date.now()}.json`;
      const fpath = path.join(dir, fname);
      const payload = {
        studentId: student._id,
        recordId: record._id,
        totalScore: total,
        details: evalDetails,
        examinerJson,
        weakAreas,
        overallConfidence,
        mappingDetails,
      };
      fs.writeFileSync(fpath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write evaluation JSON:', e.message);
    }

    return res.json({
      studentId: student._id,
      recordId: record._id,
      totalScore: total,
      details: evalDetails,
      examinerJson,
      weakAreas,
      overallConfidence,
      mappingDetails,
      ocrConfidence,
      rawText: text,
      pages: pageSummaries,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Automatic evaluation failed', message: err.message });
  }
};
