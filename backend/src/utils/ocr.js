import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { execFile } from 'child_process';

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const wordExtractor = new WordExtractor();

async function extractDocx(filePath) {
  try {
    const res = await mammoth.extractRawText({ path: filePath });
    return res?.value || '';
  } catch {
    return '';
  }
}

async function extractDoc(filePath) {
  try {
    const doc = await wordExtractor.extract(filePath);
    return doc.getBody() || '';
  } catch {
    return '';
  }
}

async function extractWithVision(filePath, mimeHint = 'image/jpeg') {
  if (!genAI) {
    console.log('[Vision] Gemini API not configured');
    return '';
  }
  try {
    console.log('[Vision] Attempting Gemini extraction for:', filePath, 'Mime:', mimeHint);
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash'
    });
    
    const buf = fs.readFileSync(filePath);
    // Check if file is too large for inline data (limit is usually 20MB for Gemini, but safer to keep lower)
    if (buf.length > 10 * 1024 * 1024) {
        console.warn('[Vision] File too large for inline processing:', filePath);
        return '';
    }

    const imageData = {
      inlineData: {
        data: buf.toString('base64'),
        mimeType: mimeHint
      }
    };
    const prompt = 'Extract the handwritten answers as plain text. Preserve line breaks. Do not summarize or rephrase. If there are multiple answers, prefix each with "Q<number>:" using the visible number; if no number is visible, infer sequential numbering starting at 1 (e.g., Q1:, Q2:). Do not add any text beyond the transcription. Transcribe this exam answer image to plain text.';
    
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const text = response.text() || '';
    console.log('[Vision] Extracted text length:', text.length);
    return text;
  } catch (e) {
    console.error('[Vision] Error:', e.message);
    return '';
  }
}

export function scoreTextConfidence(text) {
  const cleaned = String(text || '').replace(/[^a-zA-Z0-9\s\.\,\-\(\)]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const alphaCount = (cleaned.match(/[a-zA-Z0-9]/g) || []).length;
  const totalCount = cleaned.length || 1;
  const alphaRatio = alphaCount / totalCount;
  const lengthScore = Math.min(wordCount / 40, 1); // 40+ words -> strong
  const alphaScore = Math.min(alphaRatio / 0.7, 1); // 0.7+ alpha density -> strong
  return Number(((lengthScore * 0.6) + (alphaScore * 0.4)).toFixed(2));
}

function rasterizePdfToImages(pdfPath) {
  return new Promise((resolve, reject) => {
    // Use poppler's pdftoppm to convert PDF pages to PNGs
    // Outputs files alongside the pdf in a temp folder
    const outBase = pdfPath.replace(/\.pdf$/i, '');
    const args = ['-png', '-r', '200', pdfPath, outBase];
    const exe = process.env.POPPLER_PATH || 'pdftoppm';
    execFile(exe, args, (error) => {
      if (error) return reject(error);
      // Collect generated files like outBase-1.png, outBase-2.png, ...
      const dir = path.dirname(pdfPath);
      const baseName = path.basename(outBase);
      const files = fs.readdirSync(dir)
        .filter((f) => f.startsWith(baseName + '-') && f.endsWith('.png'))
        .map((f) => path.join(dir, f))
        .sort((a, b) => a.localeCompare(b));
      resolve(files);
    });
  });
}

export const extractTextFromFile = async (filePath) => {
  try {
    const exists = fs.existsSync(filePath);
    if (!exists) throw new Error('File not found for OCR');
    const ext = path.extname(filePath).toLowerCase();
    
    // Handle DOCX/DOC first
    if (ext === '.docx') {
      const docx = await extractDocx(filePath);
      if (docx.trim()) return docx;
    }
    if (ext === '.doc') {
      const doc = await extractDoc(filePath);
      if (doc.trim()) return doc;
    }

    // Handle PDF
    if (ext === '.pdf') {
      // 1. Try fast text extraction (for digital PDFs)
      try {
        const buf = fs.readFileSync(filePath);
        const parsed = await pdfParse(buf);
        if (parsed?.text && parsed.text.trim().length > 50) { 
            return parsed.text;
        }
      } catch (e) {
        console.warn('[OCR] pdf-parse failed, trying Vision:', e.message);
      }

      // 2. Try Gemini Vision (for scanned PDFs) - Replaces local rasterization
      if (genAI) {
          const visionText = await extractWithVision(filePath, 'application/pdf');
          if (visionText.trim().length > 0) return visionText;
      }

      console.warn('[OCR] PDF extraction failed (No text found and Vision failed/skipped)');
      return '';
    }

    // Handle Images (JPG, PNG)
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      // 1. Try Vision FIRST (Best quality, no local memory spike)
      if (genAI) {
          const visionText = await extractWithVision(filePath, ext === '.png' ? 'image/png' : 'image/jpeg');
          if (visionText.trim().length > 0) return visionText;
      }

      // 2. Fallback to Tesseract (Only if Vision fails)
      try {
        console.log('[OCR] Vision failed/skipped, falling back to Tesseract');
        const processed = await sharp(filePath)
            .resize({ width: 1800, height: null, fit: 'inside' })
            .grayscale()
            .toBuffer();
        const { data } = await Tesseract.recognize(processed, 'eng');
        return data?.text || '';
      } catch (err) {
        console.warn('[OCR] Fallback Tesseract failed:', err.message);
      }
    }
    
    return '';
  } catch (e) {
    console.error('[OCR] Critical Error:', e.message);
    return '';
  }
};

export const parseQAFromText = (text) => {
  // Robust parser: group multiline question blocks starting with Qn/Qn[a]/n)
  let lines = text.split(/\r?\n/);
  const firstQuestionIdx = lines.findIndex((ln) => /\bQUESTION\s+\d+/i.test(ln));
  if (firstQuestionIdx > 0) {
    lines = lines.slice(firstQuestionIdx);
  }
  const questions = [];
  let current = null;
  const startRegex = /^\s*(?:[\-\*•\u2022\u25CF\u25CB]\s*)?(Q?\d+[a-z]?)[).:\-]?\s*(.*)$/i;
  const looksLikeQuestionLabel = (rawLabel, rest) => {
    if (!rawLabel) return false;
    const trimmed = rawLabel.trim();
    if (!trimmed) return false;
    const compact = trimmed.replace(/\s+/g, '');
    const restLower = String(rest || '').toLowerCase();
    const withPrefix = compact.match(/^(q(?:uestion)?)(.+)$/i);
    if (withPrefix) {
      const suffix = withPrefix[2] || '';
      if (/^\d+[a-z]+/i.test(suffix)) return true;
      const restTrimmed = String(rest || '').trim();
      const subpartInRest = restTrimmed.match(/^\(?([a-z]{1,2})\)?[).:\-]\s*(.*)$/i);
      if (/^\d+$/i.test(suffix) && subpartInRest) {
        if (subpartInRest[2] && subpartInRest[2].length) return true;
        // Allow even if remainder is empty since subsequent lines will carry body.
        return true;
      }
      if (/^\d+$/i.test(suffix)) {
        if (!restLower) return false;
        if (restLower.includes('?')) return true;
        const keywords = ['determine', 'explain', 'describe', 'define', 'find', 'calculate', 'algorithm', 'prove', 'show', 'state', 'why', 'what', 'how', 'evaluate', 'compute', 'list', 'draw', 'complete'];
        return keywords.some((kw) => restLower.includes(kw));
      }
      return false;
    }
    const hasLetter = /[a-z]/i.test(compact);
    if (hasLetter) {
      const letterMatch = compact.match(/^(\d+)([a-z]+)/i);
      if (letterMatch && letterMatch[2] === letterMatch[2].toLowerCase()) {
        return true;
      }
    }
    const digitsOnly = /^\d+$/.test(compact);
    if (!digitsOnly) return false;
    if (!restLower) return false;
    if (restLower.includes('?')) return true;
    const keywords = ['determine', 'explain', 'describe', 'define', 'find', 'calculate', 'algorithm', 'prove', 'show', 'state', 'why', 'what', 'how', 'evaluate', 'compute', 'list', 'draw', 'complete'];
    return keywords.some((kw) => restLower.includes(kw));
  };
  for (let raw of lines) {
    const line = raw.replace(/^\s*[\-\*•\u2022\u25CF\u25CB]\s*/,'').trim();
    if (!line) continue;
    const start = line.match(startRegex);
    if (start && looksLikeQuestionLabel(start[1], start[2])) {
      console.log('[parseQA] start', start[1], 'rest', start[2]);
      // push previous
      if (current) {
        const raw = current.buffer.join('\n').trim();
        if (raw) {
          const mmatch = raw.match(/\b(Marks|Max\s*Marks)\s*[:\-]?\s*(\d+)\b/i);
          const maxMarks = mmatch ? Number(mmatch[2]) : undefined;
          const lines = raw.split(/\n+/);
          const lastLine = (lines[lines.length - 1] || '').trim();
          const trailingMarksLine = /^(?:Total\s*[-:]?\s*)?(?:Max\s*)?Marks?\b[^\d]*\d+\s*$/i.test(lastLine);
          const correctAnswer = trailingMarksLine ? lines.slice(0, -1).join('\n').trim() || raw : raw;
            console.log('[parseQA-push]', current.number, correctAnswer.length);
          questions.push({
            number: current.number
              .replace(/\s+/g, '')
              .replace(/\bquestion/i, '')
              .replace(/[^\da-z]/gi, '')
              .replace(/^q/i, ''),
            correctAnswer,
            maxMarks: maxMarks ?? 1,
          });
        }
      }
      let labelToken = (start[1] || '').trim().replace(/[).:]+$/g, '');
      let remainder = start[2] || '';
      if (!/[a-z)]$/i.test(labelToken) && remainder) {
        const subpartFromRemainder = remainder.trim().match(/^\(?([a-z]{1,2})\)?[).:\-]\s*/i);
        if (subpartFromRemainder) {
          const subToken = (subpartFromRemainder[1] || '').replace(/[^a-z]/gi, '');
          if (subToken) {
            labelToken = `${labelToken}${subToken}`;
            remainder = remainder.trim().slice(subpartFromRemainder[0].length);
          }
        }
      }
      const remainderText = remainder && remainder.trim() ? remainder.trim() : '';
      current = {
        number: labelToken || start[1],
        buffer: remainderText ? [remainderText] : [],
      };
    } else if (current) {
      // Include lines like 'o Model Answer: ...' or continuation lines
      const cleaned = line.replace(/^o\s+Model\s+Answer\s*:\s*/i, '').trim();
      console.log('[parseQA-append]', current.number, cleaned.slice(0, 40));
      if (cleaned) {
        current.buffer.push(cleaned);
      }
    }
  }
  if (current) {
    const raw = current.buffer.join('\n').trim();
     console.log('[parseQA-finalraw]', current.number, raw.length);
     if (raw) {
      const mmatch = raw.match(/\b(Marks|Max\s*Marks)\s*[:\-]?\s*(\d+)\b/i);
      const maxMarks = mmatch ? Number(mmatch[2]) : undefined;
      const lines = raw.split(/\n+/);
      const lastLine = (lines[lines.length - 1] || '').trim();
      const trailingMarksLine = /^(?:Total\s*[-:]?\s*)?(?:Max\s*)?Marks?\b[^\d]*\d+\s*$/i.test(lastLine);
      const correctAnswer = trailingMarksLine ? lines.slice(0, -1).join('\n').trim() || raw : raw;
      console.log('[parseQA-finalpush]', current.number, correctAnswer.length);
      questions.push({
        number: current.number.replace(/[^\da-z]/gi, '').replace(/^q/i, ''),
        correctAnswer,
        maxMarks: maxMarks ?? 1,
      });
    }
  }
  const merged = [];
  const indexByNumber = new Map();
  questions.forEach((q) => {
    if (!q.number) return;
    if (!indexByNumber.has(q.number)) {
      indexByNumber.set(q.number, merged.length);
      merged.push({ ...q });
      return;
    }
    const idx = indexByNumber.get(q.number);
    const existing = merged[idx];
    const existingLen = (existing.correctAnswer || '').length;
    const candidateLen = (q.correctAnswer || '').length;
    if (candidateLen > existingLen) {
      merged[idx] = {
        number: existing.number,
        correctAnswer: q.correctAnswer,
        maxMarks: q.maxMarks ?? existing.maxMarks,
      };
    } else if (!existing.maxMarks && q.maxMarks) {
      existing.maxMarks = q.maxMarks;
    }
  });
  return merged;
};

export const parseStudentAnswers = (text) => {
  // Group multiline answers per question start, preserving subparts like Q1(a)
  const lines = text.split(/\r?\n/);
  const answers = [];
  let current = null;
  const bulletRegex = /^[\-\*•\u2022\u25CF\u25CB]\s*/;
  const ROMAN_LABEL = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)$/;

  const classifySuffixType = (value) => {
    if (!value) return 'none';
    if (ROMAN_LABEL.test(value)) return 'roman';
    if (/^[a-z]+$/.test(value)) return 'alpha';
    if (/^\d+$/.test(value)) return 'numeric';
    return 'mixed';
  };

  const extractCoreLabel = (input) => {
    const text = String(input || '').trim();
    if (!text) return '';
    let idx = 0;
    const len = text.length;
    let result = '';
    const peekAlpha = (start) => {
      const match = text.slice(start).match(/^[a-z]{1,3}/i);
      if (!match) return '';
      const nextChar = text[start + match[0].length] || '';
      return /[a-z]/i.test(nextChar) ? '' : match[0];
    };

    while (idx < len) {
      const ch = text[idx];
      if (idx === 0 && /[qQ]/.test(ch)) {
        result += ch;
        idx += 1;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        result += ch;
        idx += 1;
        continue;
      }
      if (ch === '(') {
        const close = text.indexOf(')', idx + 1);
        if (close !== -1) {
          result += text.slice(idx, close + 1);
          idx = close + 1;
          continue;
        }
      }
      if ((ch === '.' || ch === '-') && idx + 1 < len) {
        let lookAhead = idx + 1;
        while (lookAhead < len && text[lookAhead] === ' ') lookAhead += 1;
        const letters = text.slice(lookAhead).match(/^[a-z]{1,2}/i);
        if (letters) {
          const nextChar = text[lookAhead + letters[0].length] || '';
          if (!/[a-z]/i.test(nextChar)) {
            result += text.slice(idx, lookAhead) + letters[0];
            idx = lookAhead + letters[0].length;
            continue;
          }
        }
      }
      if (/\s/.test(ch)) {
        const spaceMatch = text.slice(idx).match(/^\s+/);
        const spaceSegment = spaceMatch ? spaceMatch[0] : '';
        const alpha = peekAlpha(idx + spaceSegment.length);
        if (alpha && alpha.length <= 3) {
          result += spaceSegment + alpha;
          idx += spaceSegment.length + alpha.length;
          continue;
        }
        break;
      }
      break;
    }
    const finalLabel = result.trim() || text.split(/\s+/)[0];
    return /\d/.test(finalLabel) ? finalLabel : '';
  };

  const parseLabelInfo = (label) => {
    const rawInput = String(label || '').trim();
    if (!rawInput) {
      return { raw: '', display: '', normalized: '', base: '', suffix: '', suffixType: 'none' };
    }

    const cleaned = rawInput
      .replace(/\(\s*marks?\s*[:=\-]?\s*\d+\s*\)$/gi, '')
      .replace(/^(?:question|ques|qns?|ans(?:wer)?|response|no\.?)/i, '')
      .replace(/^[\s\.\-:]+/, '')
      .trim();

    const coreLabel = extractCoreLabel(cleaned);

    const compact = coreLabel.replace(/\s+/g, '');
    let stripped = compact.replace(/^q/i, '');
    if (!stripped && /^q/i.test(compact)) {
      stripped = compact.slice(1);
    }

    const sanitized = stripped.replace(/[^a-z0-9]/gi, '').toLowerCase();

    let base = sanitized.match(/^\d+/)?.[0] || '';
    let suffix = sanitized.slice(base.length);
    if (!base && !suffix && sanitized) {
      suffix = sanitized;
    }

    let suffixType = classifySuffixType(suffix);
    if (suffixType === 'alpha' && suffix.length > 2) {
      suffix = suffix.slice(0, 2);
      suffixType = classifySuffixType(suffix);
    }

    if (suffixType === 'roman' && suffix.length > 4) {
      suffix = suffix.slice(0, 4);
    }

    const normalized = `${base}${suffix}`;
    const display = coreLabel || rawInput;

    return { raw: rawInput, display, normalized, base, suffix, suffixType };
  };

  const sanitizeLabel = (label) => {
    const info = parseLabelInfo(label);
    const explicitQ = /^q(?:uestion)?/i.test(String(label || '').trim());
    const numericOnly = Boolean(info.base) && !info.suffix;
    const hasAlphaSuffix = info.suffixType === 'alpha' || info.suffixType === 'roman';
    return {
      number: info.normalized || '',
      label: info.display || info.raw || '',
      meta: {
        rawLabel: info.raw,
        explicitQ,
        numericOnly,
        hasAlphaSuffix,
        normalized: info.normalized,
        base: info.base,
        suffix: info.suffix,
      },
    };
  };

  const isOrdinalLabel = (label) => {
    const normalized = String(label || '').replace(/\s+/g, '').toLowerCase();
    return /^\d+(?:st|nd|rd|th)$/.test(normalized);
  };

  const isLikelyQuestionStart = (label, rest, meta = {}, prevSanitized = null) => {
    if (!label) return false;
    const trimmed = String(label || '').trim();
    if (!trimmed) return false;
    if (isOrdinalLabel(trimmed)) return false;

    // Reject common complexity notations like O(n^3), O(n), O(n^2) etc.
    const complexityPattern = /^o\s*\(\s*n/i;
    if (complexityPattern.test(trimmed)) return false;

    const hasQPrefix = meta.explicitQ ?? /^q(?:uestion)?/i.test(trimmed);
    const hasSubpart = /\(/.test(trimmed) || /[a-z]{1,2}\)?$/i.test(trimmed);
    if (hasQPrefix || hasSubpart) return true;

    const digitsOnly = /^\d+[a-z]?$/i.test(trimmed.replace(/[^a-z0-9]/gi, ''));
    if (!digitsOnly) return false;

    // If previous question had a subpart (e.g., Q1(a)), and current is just a number (1, 2, 3),
    // it's likely a numbered list item, NOT a new question
    if (prevSanitized && prevSanitized.meta) {
      const prevHasSubpart = prevSanitized.meta.hasAlphaSuffix || /\(/.test(prevSanitized.label || '');
      if (prevHasSubpart && meta.numericOnly && !meta.explicitQ) {
        // This is likely a numbered list item within the previous answer
        return false;
      }
    }

    const restText = String(rest || '').trim();
    if (!restText) return false;
    if (!/[a-z]/i.test(restText)) return false;
    return true;
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const withoutBullet = trimmed.replace(bulletRegex, '').trim();
    const candidateLabel = extractCoreLabel(withoutBullet);
    const sanitized = candidateLabel ? sanitizeLabel(candidateLabel) : null;
    const remainder = candidateLabel ? withoutBullet.slice(candidateLabel.length).trim() : '';
    const prevSanitized = current ? current.sanitized : null;
    const start = sanitized?.number && isLikelyQuestionStart(candidateLabel, remainder, sanitized.meta, prevSanitized);

    if (start) {
      if (current) {
        const { number, label, meta } = current.sanitized || sanitizeLabel(current.rawLabel || current.label);
        const answerText = current.buffer.join('\n').trim();
        if (answerText) {
          answers.push({
            number: number || '',
            label,
            answer: answerText,
            meta,
          });
        }
      }

      const initialBuffer = [];
      if (remainder) {
        if (sanitized.meta?.numericOnly && !sanitized.meta?.explicitQ) {
          const trimmedLabel = candidateLabel.trim();
          const needsSeparator = remainder && !/^[\.,:;!?\)\]\}]/.test(remainder);
          initialBuffer.push(`${trimmedLabel}${needsSeparator ? ' ' : ''}${remainder}`.trim());
        } else {
          initialBuffer.push(remainder);
        }
      }

      current = {
        label: candidateLabel,
        rawLabel: candidateLabel,
        sanitized,
        buffer: initialBuffer,
      };
    } else if (current) {
      current.buffer.push(withoutBullet);
    }
  }

  if (current) {
    const { number, label, meta } = current.sanitized || sanitizeLabel(current.rawLabel || current.label);
    const answerText = current.buffer.join('\n').trim();
    if (answerText) {
      answers.push({
        number: number || '',
        label,
        answer: answerText,
        meta,
      });
    }
  }

  if (answers.length === 0) {
    const chunks = text.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean);
    chunks.forEach((ch, idx) => {
      answers.push({
        number: String(idx + 1),
        label: `Q${idx + 1}`,
        answer: ch,
        meta: {
          rawLabel: `Q${idx + 1}`,
          explicitQ: true,
          numericOnly: false,
          hasAlphaSuffix: false,
          normalized: String(idx + 1),
          base: String(idx + 1),
          suffix: '',
        },
      });
    });
  }

  const merged = [];
  answers.forEach((ans) => {
    if (!ans.answer) return;
    const prev = merged[merged.length - 1];
    const numericOnly = ans.meta?.numericOnly;
    const explicitQ = ans.meta?.explicitQ;
    if (numericOnly && !explicitQ && prev) {
      const prevMeta = prev.meta || {};
      if (prevMeta.explicitQ || prevMeta.hasAlphaSuffix) {
        prev.answer = `${prev.answer}\n${ans.answer}`.trim();
        return;
      }
    }
    merged.push({ ...ans, answer: ans.answer.trim() });
  });

  // Backfill missing numbers sequentially while keeping labels for UI reference
  let seq = 1;
  return merged.map((ans) => {
    const number = ans.number || String(seq++);
    return {
      number,
      label: ans.label || `Q${number}`,
      answer: ans.answer,
    };
  });
};
