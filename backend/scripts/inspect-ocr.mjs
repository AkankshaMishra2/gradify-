import { extractTextFromFile, parseStudentAnswers } from '../src/utils/ocr.js';
import { fileURLToPath } from 'url';
import path from 'path';

async function main() {
  try {
    const target = process.argv[2];
    if (!target) {
      console.error('Usage: node scripts/inspect-ocr.mjs <relative-path>');
      process.exit(1);
    }
    const resolved = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', target);
    const text = await extractTextFromFile(resolved);
    console.log('--- RAW OCR TEXT ---');
    console.log(text);
    console.log('\n--- PARSED ANSWERS ---');
    const answers = parseStudentAnswers(text || '');
    answers.forEach((ans, idx) => {
      console.log(`Answer ${idx + 1}:`, JSON.stringify(ans, null, 2));
    });
  } catch (err) {
    console.error('Failed to inspect OCR:', err);
    process.exit(1);
  }
}

main();
