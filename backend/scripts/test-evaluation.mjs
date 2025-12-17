import { extractTextFromFile, parseStudentAnswers, parseQAFromText } from '../src/utils/ocr.js';
import { evaluateExam } from '../src/utils/evaluator.js';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
  const [keyRel, studentRel] = process.argv.slice(2);
  if (!keyRel || !studentRel) {
    console.error('Usage: node scripts/test-evaluation.mjs <answer-key-file> <student-file>');
    process.exit(1);
  }

  const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const keyPath = path.resolve(baseDir, keyRel);
  const studentPath = path.resolve(baseDir, studentRel);

  const keyText = await extractTextFromFile(keyPath);
  const keyQuestions = parseQAFromText(keyText).map((q, idx) => ({
    number: q.number || String(idx + 1),
    question: q.correctAnswer.split('|')[0]?.trim() || '',
    correctAnswer: q.correctAnswer,
    maxMarks: q.maxMarks || 1,
  }));

  const studentText = await extractTextFromFile(studentPath);
  const studentAnswers = parseStudentAnswers(studentText).map((ans, idx) => ({
    index: idx,
    number: ans.number,
    label: ans.label,
    answer: ans.answer,
  }));

  const evaluation = await evaluateExam({ answerKey: keyQuestions, studentAnswers });
  console.log(JSON.stringify({
    keyQuestions,
    studentAnswers,
    evaluation,
  }, null, 2));
}

main().catch((err) => {
  console.error('Failed to run evaluation test:', err);
  process.exit(1);
});
