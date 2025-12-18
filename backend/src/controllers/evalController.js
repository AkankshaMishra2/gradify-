import AnswerKey from '../models/AnswerKey.js';
import Student from '../models/Student.js';
import EvaluationRecord from '../models/EvaluationRecord.js';
import { evaluateExam } from '../utils/evaluator.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const evalSchema = z.object({
  student: z.object({ name: z.string().min(2), rollNumber: z.string().min(1) }),
  keyId: z.string().min(1),
  answers: z.array(z.object({ number: z.string(), answer: z.string() })),
});

export const evaluate = async (req, res) => {
  const parsed = evalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const { student: studentInfo, keyId, answers } = parsed.data;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const key = await AnswerKey.findOne({ _id: keyId, createdBy: userId });
    if (!key) return res.status(404).json({ error: 'Answer key not found' });

    const normalizeQ = (n) => String(n || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^q/, '');

    const answersWithMeta = answers.map((ans, idx) => ({
      index: idx,
      number: String(ans.number || ''),
      label: ans.number || `Q${idx + 1}`,
      normalized: normalizeQ(ans.number || ''),
      answer: String(ans.answer || ''),
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
      name: studentInfo.name,
      rollNumber: studentInfo.rollNumber,
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

    // Persist evaluation JSON to disk for auditing
    try {
      const dir = path.join(process.cwd(), 'storage', 'evaluations');
      fs.mkdirSync(dir, { recursive: true });
      const fname = `${String(student._id)}-${Date.now()}.json`;
      const fpath = path.join(dir, fname);
      const payload = { studentId: student._id, recordId: record._id, totalScore: total, details: evalDetails, examinerJson, weakAreas, overallConfidence, mappingDetails };
      fs.writeFileSync(fpath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      // Non-fatal: log and continue
      console.warn('Failed to write evaluation JSON:', e.message);
    }

    return res.json({ studentId: student._id, recordId: record._id, totalScore: total, details: evalDetails, examinerJson, weakAreas, overallConfidence, mappingDetails });
  } catch (err) {
    return res.status(500).json({ error: 'Evaluation failed', message: err.message });
  }
};

export const getLatestEvaluationByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const student = await Student.findOne({ _id: studentId, createdBy: userId });
    if (!student) return res.status(404).json({ error: 'Evaluation record not found' });

    const record = await EvaluationRecord.findOne({ student: studentId, createdBy: userId }).sort({ createdAt: -1 });
    if (!record) return res.status(404).json({ error: 'Evaluation record not found' });
    return res.json({ record });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch evaluation failed', message: err.message });
  }
};
