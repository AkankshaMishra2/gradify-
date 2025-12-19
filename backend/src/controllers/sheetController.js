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

const makeHttpError = (status, message, extra) => {
  const err = new Error(message);
  err.status = status;
  if (extra) err.extra = extra;
  return err;
};

const normalizeQuestionLabel = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .replace(/^q/, '');

const evaluateAndPersistStudent = async ({ userId, files, studentName, rollNumber, key }) => {
  if (!Array.isArray(files) || !files.length) {
    throw makeHttpError(400, 'No files uploaded');
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
    throw makeHttpError(400, 'No answers parsed from sheet', {
      hint: 'Check OCR raw text for formatting',
      rawText: text,
      confidence: ocrConfidence,
    });
  }

  const answersWithMeta = answers.map((ans, idx) => ({
    index: idx,
    number: String(ans.number || ''),
    label: ans.label || ans.number || `Q${idx + 1}`,
    normalized: normalizeQuestionLabel(ans.number || ans.label || ''),
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
    createdBy: userId,
    name: studentName,
    rollNumber,
    extractedAnswers: answers.map((ans) => ({ number: ans.number, answer: ans.answer })),
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
    createdBy: userId,
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

  return {
    studentId: student._id,
    recordId: record._id,
    studentName,
    rollNumber,
    totalScore: total,
    details: evalDetails,
    examinerJson,
    weakAreas,
    overallConfidence,
    mappingDetails,
    ocrConfidence,
    rawText: text,
    pages: pageSummaries,
  };
};

export const uploadSheet = async (req, res) => {
  console.log('[Upload] Received upload request');
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const files = collectUploadedFiles(req);
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });
    const { studentName, rollNumber, keyId } = req.body;
    if (!studentName || !rollNumber) {
      return res.status(400).json({ error: 'Student name and roll number are required' });
    }
    if (!keyId) {
      return res.status(400).json({ error: 'Answer key ID is required' });
    }

    const key = await AnswerKey.findOne({ _id: keyId, createdBy: userId });
    if (!key) return res.status(404).json({ error: 'Answer key not found' });

    try {
      const result = await evaluateAndPersistStudent({
        userId,
        files,
        studentName,
        rollNumber,
        key,
      });

      return res.json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ error: 'Automatic evaluation failed', message: err.message });
  }
};

export const uploadAndEvaluateBatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const keyId = req.body?.keyId;
    if (!keyId) return res.status(400).json({ error: 'Answer key ID is required' });

    let studentsSpec = req.body?.students;
    if (typeof studentsSpec === 'string') {
      try {
        studentsSpec = JSON.parse(studentsSpec);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid students payload' });
      }
    }

    if (!Array.isArray(studentsSpec) || !studentsSpec.length) {
      return res.status(400).json({ error: 'At least one student is required for batch evaluation' });
    }

    const MAX_STUDENTS = 5;
    if (studentsSpec.length > MAX_STUDENTS) {
      return res.status(400).json({
        error: 'Batch limit exceeded',
        hint: `You can evaluate up to ${MAX_STUDENTS} students at once`,
      });
    }

    const key = await AnswerKey.findOne({ _id: keyId, createdBy: userId });
    if (!key) return res.status(404).json({ error: 'Answer key not found' });

    const files = collectUploadedFiles(req);
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    let cursor = 0;
    const results = [];

    for (let i = 0; i < studentsSpec.length; i += 1) {
      const spec = studentsSpec[i] || {};
      const studentName = String(spec.name || spec.studentName || '').trim();
      const rollNumber = String(spec.rollNumber || spec.roll || '').trim();
      const fileIndices = Array.isArray(spec.fileIndices)
        ? spec.fileIndices
        : [];

      if (!studentName || !rollNumber) {
        results.push({
          index: i,
          status: 'error',
          studentName,
          rollNumber,
          error: 'Student name and roll number are required',
        });
        continue;
      }

      let assignedFiles = [];
      if (fileIndices.length) {
        assignedFiles = fileIndices
          .map((idx) => files[Number(idx)])
          .filter(Boolean);
      } else if (typeof spec.fileCount === 'number' && spec.fileCount > 0) {
        const count = Math.min(spec.fileCount, files.length - cursor);
        assignedFiles = files.slice(cursor, cursor + count);
        cursor += count;
      } else if (cursor < files.length) {
        assignedFiles = [files[cursor]];
        cursor += 1;
      }

      if (!assignedFiles.length) {
        results.push({
          index: i,
          status: 'error',
          studentName,
          rollNumber,
          error: 'No files provided for student',
        });
        continue;
      }

      try {
        const evaluation = await evaluateAndPersistStudent({
          userId,
          files: assignedFiles,
          studentName,
          rollNumber,
          key,
        });

        results.push({
          index: i,
          status: 'success',
          ...evaluation,
        });
      } catch (err) {
        if (err.status) {
          results.push({
            index: i,
            status: 'error',
            studentName,
            rollNumber,
            error: err.message,
            details: err.extra || null,
          });
        } else {
          console.error('[Batch] Evaluation failed', err);
          results.push({
            index: i,
            status: 'error',
            studentName,
            rollNumber,
            error: 'Automatic evaluation failed',
            details: { message: err.message },
          });
        }
      }
    }

    const summary = {
      successCount: results.filter((r) => r.status === 'success').length,
      failureCount: results.filter((r) => r.status === 'error').length,
    };

    return res.json({ results, summary });
  } catch (err) {
    console.error('[Batch] Fatal error', err);
    return res.status(500).json({ error: 'Batch evaluation failed', message: err.message });
  }
};
