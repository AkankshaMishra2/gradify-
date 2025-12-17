import { GoogleGenerativeAI } from '@google/generative-ai';

// ===================== INIT =====================
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// ===================== FINAL PROMPTS =====================

// -------- SYSTEM PROMPT --------
const SYSTEM_PROMPT = `
You are an experienced and fair university examiner for Data Structures and Algorithms.

You always receive:
- The official answer key (question numbers, subparts, correct answers, marking scheme).
- Student answers transcribed from handwritten exam sheets. These may be unordered, noisy, duplicated, partially written, or poorly labelled.

Evaluation principles (MANDATORY):
1. Treat the official answer key as the single source of truth.
2. First align student content to the correct question and subpart before grading. Never assume ordering.
3. Award marks primarily based on conceptual understanding and correct approach.
4. If the student applies the correct algorithm, data structure, or method, award full marks even if:
   - Minor arithmetic mistakes exist
   - Intermediate steps are missing
   - Presentation or notation is informal
5. Deduct marks only for fundamental conceptual errors, wrong algorithm, or missing core steps.
6. Ignore handwriting issues, OCR noise, spelling/grammar mistakes, overwriting, or red-ink annotations.
7. Alternate methods earn credit only if allowed by the answer key.
8. Never invent knowledge that the student did not explicitly demonstrate.
9. Explain scoring briefly and objectively, like a human examiner.

Always behave like a real university examiner, not a strict validator.
`;

// -------- OUTPUT SCHEMA GUIDE --------
const OUTPUT_SCHEMA_GUIDE = `
Return strict JSON with this structure:
{
  "questions": [
    {
      "questionNumber": "string",
      "questionText": "string",
      "maxMarks": number,
      "scoreAwarded": number,
      "missingPoints": "string",
      "reason": "string",
      "mappedStudentAnswerLabel": "string",
      "mappedStudentAnswerText": "string",
      "mappingConfidence": number,
      "confidence": number
    }
  ],
  "totalScore": number,
  "overallFeedback": "string",
  "weakAreas": ["string"],
  "overallConfidence": number
}
`;

// -------- SINGLE QUESTION EVALUATION PROMPT --------
const QUESTION_EVAL_PROMPT = `
You are a fair, concept-focused university examiner for Data Structures and Algorithms.

Your task:
Evaluate ONE question using the official answer key and the student answer.

Mandatory grading rules:
1. Match the student answer to the answer key concept-by-concept, not word-by-word.
2. If the student demonstrates the correct algorithm, data structure, or logical approach, award FULL marks.
3. Do NOT deduct marks for:
   - Minor calculation errors
   - Missing intermediate values
   - Informal stack/queue representations
   - Incomplete explanations when the method is correct
4. For algorithmic questions:
   - Correct algorithm + correct steps = full marks
   - Time complexity may be ignored unless explicitly asked
5. Allocate partial credit proportionally ONLY if:
   - Some required conceptual steps are present
   - But the core algorithm is incomplete or partially incorrect
6. Deduct marks ONLY for:
   - Wrong algorithm
   - Incorrect operand order (e.g., reversed subtraction/division)
   - Logical contradictions
   - Completely missing the core idea
7. Blank or irrelevant answers get 0.
8. Ignore handwriting noise, spelling mistakes, OCR artifacts, and evaluator markings.

Scoring rules:
- Score must be between 0 and maxMarks (inclusive).
- If the final result is correct AND the method is correct → FULL marks.
- Be academically fair, not overly strict.

Output STRICT JSON only in this format:
{
  "score": number,
  "maxMarks": number,
  "percentage": number,
  "conceptMatch": "brief list of matched concepts",
  "missingPoints": "brief list of missing or incorrect concepts",
  "reason": "one-line examiner justification"
}

Do NOT add explanations outside JSON.
`;

// ===================== HELPERS =====================
const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const sanitize = (input, limit = 4000) => {
  const cleaned = String(input || '')
    .replace(/[\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
};

const normalizeText = (input) =>
  String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (input) => normalizeText(input).split(' ').filter(Boolean);

const jaccardSimilarity = (a, b) => {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;
  const intersection = [...aTokens].filter((t) => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union ? intersection / union : 0;
};

const extractKeyphrases = (text) => {
  const tokens = tokenize(text).filter((t) => t.length > 4);
  if (!tokens.length) return [];
  const freq = new Map();
  tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
  const topSingles = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${tokens[i]} ${tokens[i + 1]}`;
    if (pair.length > 10) bigrams.push(pair);
  }
  return [...topSingles, ...bigrams.slice(0, 4)];
};

const ROMAN_PATTERN = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)$/;

const parseQuestionLabel = (label) => {
  const raw = String(label || '').trim();
  if (!raw) return { raw: '', display: '', normalized: '', base: '', suffix: '', suffixType: 'none' };

  const cleaned = raw
    .replace(/\(\s*marks?\s*[:=\-]?\s*\d+\s*\)$/gi, '')
    .replace(/^(?:question|ques|qns?|ans(?:wer)?|response|no\.?)/i, '')
    .replace(/^[\s\.\-:]+/, '')
    .trim();

  const compact = cleaned.replace(/\s+/g, '');
  let stripped = compact.replace(/^q/i, '');
  if (!stripped && /^q/i.test(compact)) stripped = compact.slice(1);

  const sanitized = stripped.replace(/[^a-z0-9]/gi, '').toLowerCase();
  let base = sanitized.match(/^\d+/)?.[0] || '';
  let suffix = sanitized.slice(base.length);
  let suffixType = 'none';

  const markSuffixType = (v) => {
    if (!v) return 'none';
    if (ROMAN_PATTERN.test(v)) return 'roman';
    if (/^[a-z]+$/.test(v)) return 'alpha';
    if (/^\d+$/.test(v)) return 'numeric';
    return 'mixed';
  };

  if (!base && !suffix && sanitized) suffix = sanitized;
  suffixType = markSuffixType(suffix);

  const normalized = `${base}${suffix}`;
  const display = /^q/i.test(raw) ? raw : base ? `Q${base}${suffix ? `(${suffix})` : ''}` : raw;
  return { raw, display, normalized, base, suffix, suffixType };
};

const extractContentHints = (text) => {
  const lower = String(text || '').toLowerCase();
  const numberHints = new Set();
  const subpartHints = new Set();

  const numberRegex = /\b(?:q(?:uestion)?|ans(?:wer)?|problem|section)?\s*(\d{1,2})\b/g;
  let m;
  while ((m = numberRegex.exec(lower))) numberHints.add(m[1]);

  const letterRegex = /\b(?:part|section)?\s*([a-z])\b/g;
  while ((m = letterRegex.exec(lower))) subpartHints.add(m[1]);

  const romanRegex = /\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g;
  while ((m = romanRegex.exec(lower))) subpartHints.add(m[1]);

  return { numberHints, subpartHints };
};

const compareSuffix = (a, b) => a && b && a.toLowerCase() === b.toLowerCase();

const computeAlignmentScore = ({ candidate, keyQuestion, keyIndex, totalAnswers, lastMatchedIndex }) => {
  if (!candidate) return { combined: 0, labelScore: 0, textScore: 0, orderScore: 0 };

  const keyInfo = keyQuestion.labelInfo || {};
  const candInfo = candidate.labelInfo || {};
  const hints = candidate.contentHints || { numberHints: new Set(), subpartHints: new Set() };

  let labelScore = 0.2;
  const basesMatch = candInfo.base && keyInfo.base && candInfo.base === keyInfo.base;
  const suffixesMatch = compareSuffix(candInfo.suffix, keyInfo.suffix);

  if (candInfo.normalized && keyInfo.normalized && candInfo.normalized === keyInfo.normalized) labelScore = 1;
  else if (basesMatch && suffixesMatch) labelScore = 0.95;
  else if (!candInfo.base && suffixesMatch && keyInfo.base) labelScore = 0.85;
  else if (basesMatch) labelScore = keyInfo.suffix ? 0.7 : 0.9;
  else if (candInfo.base && keyInfo.base && candInfo.base !== keyInfo.base) labelScore = 0.15;

  if (labelScore < 0.9 && keyInfo.base && hints.numberHints.has(keyInfo.base)) labelScore = Math.max(labelScore, 0.8);
  if (labelScore < 0.9 && keyInfo.suffix && hints.subpartHints.has(keyInfo.suffix.toLowerCase()))
    labelScore = Math.max(labelScore, 0.75);

  const referenceText = `${keyQuestion.question || ''} ${keyQuestion.correctAnswer || ''}`;
  const textScore = jaccardSimilarity(referenceText, candidate.answer || '');

  const baseline = lastMatchedIndex >= 0 ? lastMatchedIndex : keyIndex;
  const delta = Math.abs(candidate.index - baseline);
  const denom = Math.max(totalAnswers - 1, 1);
  const orderScore = 1 - Math.min(delta / denom, 1);

  const completeness = candidate.answer && candidate.answer.trim().length ? 1 : 0.3;
  const combined = clamp((labelScore * 0.55 + textScore * 0.35 + orderScore * 0.1) * completeness, 0, 1);
  return { combined, labelScore, textScore, orderScore };
};

// ===================== PROMPT BUILDERS =====================
const buildPrompt = (answerKey, studentAnswers) => {
  const keySection = answerKey
    .map(
      (q, idx) =>
        `Q${idx + 1}:\nNumber: ${sanitize(q.number)}\nText: ${sanitize(q.question)}\nCorrect Answer: ${sanitize(
          q.correctAnswer
        )}\nMax Marks: ${q.maxMarks}`
    )
    .join('\n\n');

  const answerSection = studentAnswers
    .map(
      (ans, idx) =>
        `Answer ${idx + 1}:\nLabel: ${sanitize(ans.label)}\nText: ${sanitize(ans.answer)}\nPage: ${
          ans.pageIndex ?? 'unknown'
        }`
    )
    .join('\n\n');

  return `${SYSTEM_PROMPT}\n\n${OUTPUT_SCHEMA_GUIDE}\n\n[ANSWER_KEY]\n${keySection}\n\n[STUDENT_ANSWERS]\n${answerSection}`;
};

// ===================== GEMINI CALL =====================
const callGeminiEvaluation = async (answerKey, studentAnswers) => {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });

  const prompt = buildPrompt(answerKey, studentAnswers);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  const text = (await result.response)?.text()?.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const normalizeLlmResult = (raw, answerKey, studentAnswers) => {
  const questions = Array.isArray(raw?.questions) ? raw.questions : [];
  const details = [];
  const mappingDetails = [];
  const usedLabels = new Set();

  questions.forEach((entry) => {
    const number = String(entry?.questionNumber || '').trim() || '';
    const keyMatch = answerKey.find((q) => String(q.number) === number) || null;
    const score = clamp(Number(entry?.scoreAwarded || entry?.score || 0), 0, Number(entry?.maxMarks || keyMatch?.maxMarks || 0));
    const maxMarks = Number(entry?.maxMarks || keyMatch?.maxMarks || 0);
    const percentage = maxMarks ? Number(((score / maxMarks) * 100).toFixed(2)) : 0;
    const mappingConfidence = clamp(Number(entry?.mappingConfidence ?? entry?.confidence ?? 0.75), 0, 1);
    const confidence = clamp(Number(entry?.confidence ?? percentage / 100), 0, 1);
    const mappedLabel = entry?.mappedStudentAnswerLabel || null;
    if (mappedLabel) usedLabels.add(mappedLabel.toLowerCase());

    details.push({
      number: number || (keyMatch ? String(keyMatch.number) : ''),
      questionId: keyMatch ? keyMatch.id : null,
      question: sanitize(entry?.questionText || keyMatch?.question || ''),
      maxMarks,
      score,
      percentage,
      conceptMatch: sanitize(entry?.conceptMatch || ''),
      missingPoints: sanitize(entry?.missingPoints || ''),
      reason: sanitize(entry?.reason || ''),
      mappingConfidence,
      confidence,
      mappedStudentAnswerLabel: mappedLabel,
      mappedStudentAnswerText: sanitize(entry?.mappedStudentAnswerText || ''),
    });

    mappingDetails.push({
      sourceNumber: mappedLabel || 'Unmapped',
      matchedQuestionId: keyMatch ? keyMatch.id : null,
      matchedQuestionNumber: number || (keyMatch ? String(keyMatch.number) : null),
      confidence: mappingConfidence,
      note: mappedLabel ? (mappingConfidence < 0.5 ? 'Weak mapping' : 'Mapped') : 'No student answer mapped',
    });
  });

  studentAnswers.forEach((ans) => {
    const key = (ans.label || '').toLowerCase();
    if (!key || usedLabels.has(key)) return;
    mappingDetails.push({
      sourceNumber: ans.label,
      matchedQuestionId: null,
      matchedQuestionNumber: null,
      confidence: 0,
      note: 'Unmapped student answer',
    });
  });

  const totalScore = Number(raw?.totalScore ?? details.reduce((acc, d) => acc + Number(d.score || 0), 0));
  const weakAreas = Array.isArray(raw?.weakAreas) ? raw.weakAreas.map((w) => String(w)) : [];
  const overallFeedback = sanitize(raw?.overallFeedback || raw?.summary || 'Review the provided solutions to strengthen weak concepts.');
  const overallConfidence = clamp(Number(raw?.overallConfidence ?? raw?.confidence ?? 0.75), 0, 1);

  const confidenceAccumulator = details.reduce((acc, d) => acc + clamp(d.confidence, 0, 1), 0);
  const averagedConfidence = details.length ? Number((confidenceAccumulator / details.length).toFixed(2)) : overallConfidence;

  const examinerEvaluation = {};
  details.forEach((d) => {
    examinerEvaluation[`Q${d.number}`] = {
      question: d.question,
      expectedAnswer: answerKey.find((kq) => String(kq.number) === String(d.number))?.correctAnswer || '',
      studentAnswer: d.mappedStudentAnswerText,
      maxMarks: d.maxMarks,
      scoreAwarded: d.score,
      percentage: d.percentage,
      conceptMatch: d.conceptMatch,
      missingPoints: d.missingPoints,
      reason: d.reason,
      mappingConfidence: d.mappingConfidence,
      mappedStudentAnswerLabel: d.mappedStudentAnswerLabel,
    };
  });

  return {
    details,
    totalScore,
    overallFeedback,
    weakAreas,
    overallConfidence: averagedConfidence,
    mappingDetails,
    examinerJson: {
      evaluation: examinerEvaluation,
      totalScore,
      overallFeedback,
      weakAreas,
      overallConfidence: averagedConfidence,
      mappingDetails,
    },
  };
};

const fallbackScore = ({ correctAnswer, studentAnswer, maxMarks }) => {
  const ca = normalizeText(correctAnswer);
  const sa = normalizeText(studentAnswer);
  if (!sa) return { score: 0, reason: 'No answer provided', coverage: 0 };
  if (sa === ca) {
    const full = Number(maxMarks) || 0;
    return { score: full, reason: 'Exact match', coverage: 1 };
  }

  const keyphrases = extractKeyphrases(ca);
  const kpCoverage = keyphrases.length ? keyphrases.filter((kp) => sa.includes(kp)).length / keyphrases.length : 0;
  const jaccard = jaccardSimilarity(ca, sa);
  const coverage = Math.max(jaccard * 0.6 + kpCoverage * 0.4, kpCoverage * 0.8);
  const max = Number(maxMarks) || 0;
  const score = Math.round(clamp(coverage, 0, 1) * max);
  const reason = `Heuristic scorer: ~${Math.round((coverage || 0) * 100)}% overlap and key points covered.`;
  return { score, reason, coverage };
};

const heuristicResult = ({ correctAnswer, studentAnswer, maxMarks }) => {
  const { score, reason, coverage } = fallbackScore({ correctAnswer, studentAnswer, maxMarks });
  const max = Number(maxMarks || 0);
  const percentage = max ? Number(((score / max) * 100).toFixed(2)) : 0;
  const ca = normalizeText(correctAnswer);
  const sa = normalizeText(studentAnswer);
  const keyphrases = extractKeyphrases(ca);
  const covered = keyphrases.filter((kp) => sa.includes(kp));
  const missing = keyphrases.filter((kp) => !sa.includes(kp));
  return {
    score,
    maxMarks: max,
    percentage,
    conceptMatch: covered.length ? `Covered: ${covered.slice(0, 5).join(', ')}` : 'Minimal concept overlap',
    missingPoints: missing.length ? `Missing: ${missing.slice(0, 5).join(', ')}` : 'Few missing key points',
    reason,
    confidence: clamp(coverage || 0.6, 0, 1),
  };
};

const legacyEvaluateExam = (answerKey, studentAnswers) => {
  const preparedAnswers = studentAnswers.map((ans, idx) => {
    const labelInfo = parseQuestionLabel(ans.label || ans.number || `Q${idx + 1}`);
    const contentHints = extractContentHints(ans.answer || '');
    return {
      index: idx,
      label: labelInfo.display || `Q${idx + 1}`,
      normalized: labelInfo.normalized,
      labelInfo,
      contentHints,
      answer: ans.answer || '',
      pageIndex: ans.pageIndex ?? null,
    };
  });

  const details = [];
  const mappingDetails = [];
  const usedAnswerIndexes = new Set();
  let lastMatchedIndex = -1;
  let totalScore = 0;
  let confidenceAccumulator = 0;

  answerKey.forEach((kq, qi) => {
    const keyLabelInfo = kq.labelInfo || parseQuestionLabel(kq.number);
    const enrichedKey = { ...kq, labelInfo: keyLabelInfo, normalized: keyLabelInfo.normalized };
    let selected = null;
    let metrics = { combined: 0 };
    const totalAnswers = preparedAnswers.length;

    for (const candidate of preparedAnswers) {
      if (usedAnswerIndexes.has(candidate.index)) continue;
      const candidateMetrics = computeAlignmentScore({
        candidate,
        keyQuestion: enrichedKey,
        keyIndex: qi,
        totalAnswers,
        lastMatchedIndex,
      });
      if (!selected || candidateMetrics.combined > metrics.combined) {
        selected = candidate;
        metrics = candidateMetrics;
      }
    }

    if (selected && metrics.combined < 0.35) {
      const sequential = preparedAnswers.find((c) => !usedAnswerIndexes.has(c.index) && c.index > lastMatchedIndex)
        || preparedAnswers.find((c) => !usedAnswerIndexes.has(c.index));
      if (sequential && sequential.index !== selected.index) {
        const seqMetrics = computeAlignmentScore({
          candidate: sequential,
          keyQuestion: enrichedKey,
          keyIndex: qi,
          totalAnswers,
          lastMatchedIndex,
        });
        if (seqMetrics.combined > metrics.combined) {
          selected = sequential;
          metrics = seqMetrics;
        }
      }
    }

    if (selected) {
      usedAnswerIndexes.add(selected.index);
      lastMatchedIndex = selected.index;
    }

    const studentAnswer = selected ? selected.answer : '';
    const { score, reason, coverage } = fallbackScore({
      correctAnswer: enrichedKey.correctAnswer,
      studentAnswer,
      maxMarks: enrichedKey.maxMarks,
    });
    const maxMarks = Number(enrichedKey.maxMarks || 0);
    const percentage = maxMarks ? Number(((score / maxMarks) * 100).toFixed(2)) : 0;
    const mappingConfidence = selected ? metrics.combined : 0;
    const confidence = clamp(mappingConfidence * 0.4 + coverage * 0.6, 0, 1);

    totalScore += score;
    confidenceAccumulator += confidence;

    const detail = {
      number: String(enrichedKey.number),
      questionId: enrichedKey.id,
      question: enrichedKey.question || `Q${enrichedKey.number}`,
      maxMarks,
      score,
      percentage,
      conceptMatch: coverage > 0.6 ? 'Key ideas partially present' : coverage > 0.3 ? 'Limited overlap with key concepts' : 'Minimal concept overlap',
      missingPoints: coverage > 0.6 ? 'Missing detailed steps required for full marks' : 'Core concepts absent',
      reason,
      mappingConfidence,
      confidence,
      mappedStudentAnswerLabel: selected ? selected.label : null,
      mappedStudentAnswerText: studentAnswer,
    };
    details.push(detail);

    mappingDetails.push({
      sourceNumber: selected ? selected.label : 'Unanswered',
      matchedQuestionId: enrichedKey.id,
      matchedQuestionNumber: String(enrichedKey.number),
      confidence: mappingConfidence,
      note: selected ? (mappingConfidence < 0.5 ? 'Weak mapping' : 'Mapped') : 'No student answer mapped',
    });
  });

  preparedAnswers.forEach((ans) => {
    if (usedAnswerIndexes.has(ans.index)) return;
    mappingDetails.push({
      sourceNumber: ans.label,
      matchedQuestionId: null,
      matchedQuestionNumber: null,
      confidence: 0,
      note: 'Unmapped student answer',
    });
  });

  const weakAreas = details
    .filter((d) => d.percentage < 70 || d.mappingConfidence < 0.6)
    .map((d) => `Q${d.number}`);

  const overallConfidence = details.length ? Number((confidenceAccumulator / details.length).toFixed(2)) : 0;

  const maxTotal = details.reduce((acc, d) => acc + (d.maxMarks || 0), 0);
  const percentage = maxTotal ? Math.round((totalScore / maxTotal) * 100) : 0;
  let overallFeedback = 'Limited coverage; revisit fundamentals and practice structured answers.';
  if (percentage >= 80) overallFeedback = 'Strong performance with good conceptual coverage.';
  else if (percentage >= 60) overallFeedback = 'Decent understanding; improve detail and accuracy.';
  else if (percentage >= 40) overallFeedback = 'Partial understanding; review key concepts and worked examples.';

  const examinerEvaluation = {};
  details.forEach((d) => {
    examinerEvaluation[`Q${d.number}`] = {
      question: d.question,
      expectedAnswer: answerKey.find((kq) => String(kq.number) === String(d.number))?.correctAnswer || '',
      studentAnswer: d.mappedStudentAnswerText,
      maxMarks: d.maxMarks,
      scoreAwarded: d.score,
      percentage: d.percentage,
      conceptMatch: d.conceptMatch,
      missingPoints: d.missingPoints,
      reason: d.reason,
      mappingConfidence: d.mappingConfidence,
      mappedStudentAnswerLabel: d.mappedStudentAnswerLabel,
    };
  });

  return {
    details,
    totalScore,
    overallFeedback,
    weakAreas,
    overallConfidence,
    mappingDetails,
    examinerJson: {
      evaluation: examinerEvaluation,
      totalScore,
      overallFeedback,
      weakAreas,
      overallConfidence,
      mappingDetails,
    },
  };
};

export const evaluateExam = async ({ answerKey, studentAnswers }) => {
  const canonicalKey = Array.isArray(answerKey) ? answerKey : [];
  if (!canonicalKey.length) {
    throw new Error('Answer key is required for evaluation');
  }

  const preparedKey = canonicalKey.map((q, idx) => {
    const numberLabel = q.number || q.label || idx + 1;
    const labelInfo = parseQuestionLabel(numberLabel);
    return {
      id: String(q._id || idx),
      number: String(numberLabel),
      question: sanitize(q.question || q.prompt || ''),
      correctAnswer: sanitize(q.correctAnswer || q.answer || ''),
      markingScheme: sanitize(q.markingScheme || q.scoringGuidelines || ''),
      maxMarks: Number(q.maxMarks || q.marks || 0) || 0,
      labelInfo,
      normalized: labelInfo.normalized,
    };
  });

  const preparedAnswers = (Array.isArray(studentAnswers) ? studentAnswers : []).map((ans, idx) => {
    const label = ans.label || ans.number || ans.questionNo || `Answer${idx + 1}`;
    const labelInfo = parseQuestionLabel(label);
    const contentHints = extractContentHints(ans.answer || ans.text || '');
    return {
      label: labelInfo.display || `Answer${idx + 1}`,
      normalized: labelInfo.normalized,
      labelInfo,
      contentHints,
      answer: String(ans.answer || ans.text || '').trim(),
      pageIndex: ans.pageIndex ?? ans.page ?? null,
      index: idx,
    };
  });

  const llmRaw = await callGeminiEvaluation(preparedKey, preparedAnswers);
  if (llmRaw) {
    return normalizeLlmResult(llmRaw, preparedKey, preparedAnswers);
  }

  return legacyEvaluateExam(preparedKey, preparedAnswers);
};

// ===================== SINGLE ANSWER EVAL =====================
export const evaluateAnswer = async ({ question, correctAnswer, studentAnswer, maxMarks }) => {
  const trimmed = String(studentAnswer || '').trim();
  if (!trimmed || !genAI) {
    return {
      score: 0,
      maxMarks,
      percentage: 0,
      conceptMatch: '',
      missingPoints: 'No answer provided',
      reason: 'Blank or missing response',
      confidence: 0,
    };
  }

  const promptText = `${QUESTION_EVAL_PROMPT}

[QUESTION]
${sanitize(question)}

[ANSWER_KEY]
${sanitize(correctAnswer)}

[STUDENT_ANSWER]
${sanitize(trimmed)}

[SCORING]
Max Marks: ${maxMarks}
`;

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
  });
  const text = (await result.response)?.text()?.trim();
  if (!text) throw new Error('Empty response');

  const parsed = JSON.parse(text);
  const score = clamp(Number(parsed.score), 0, Number(parsed.maxMarks || maxMarks));
  const percentage = Number(((score / (parsed.maxMarks || maxMarks)) * 100).toFixed(2));

  return {
    score,
    maxMarks: parsed.maxMarks || maxMarks,
    percentage,
    conceptMatch: parsed.conceptMatch || '',
    missingPoints: parsed.missingPoints || '',
    reason: parsed.reason || '',
    confidence: clamp(percentage / 100, 0, 1),
  };
};
