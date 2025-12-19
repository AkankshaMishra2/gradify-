// Gradify API client wired to backend endpoints

// In production, point to the Render backend.
// If VITE_API_BASE_URL is set, use it. Otherwise, default to the known Render URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://gradify-crr7.onrender.com' : 'http://localhost:5000');

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

const authHeaders = () => authToken ? { Authorization: `Bearer ${authToken}` } : {};

async function httpJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function httpForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface UploadKeyResponse {
  keyId: string;
  count: number;
  rawText?: string;
  confidence?: number;
}

export interface OCRPageSummary {
  index: number;
  fileName: string;
  rawText: string;
  confidence?: number;
}

export interface UploadSheetResponse {
  answers: { number: string; answer: string }[];
  rawText?: string;
  confidence?: number;
  pages?: OCRPageSummary[];
}

export interface OCRResult {
  studentName: string;
  rollNo: string;
  answers: { number: string; answer: string }[];
  rawText?: string;
  confidence?: number;
  pages?: OCRPageSummary[];
}

export interface EvaluationDetail {
  number: string;
  maxMarks: number;
  score: number;
  reason: string;
  studentAnswer: string;
  correctAnswer?: string;
  conceptMatch?: string;
  missingPoints?: string;
  percentage?: number;
  mappingConfidence?: number;
  confidence?: number;
}

export interface MappingDetail {
  sourceNumber: string;
  matchedQuestionId: string | null;
  matchedQuestionNumber: string | null;
  confidence: number;
  note?: string;
}

export interface EvaluationResult {
  totalScore: number;
  details: EvaluationDetail[];
  studentId: string;
  recordId: string;
  examinerJson?: unknown;
  weakAreas?: string[];
  overallConfidence?: number;
  mappingDetails?: MappingDetail[];
  pages?: OCRPageSummary[];
}

export interface BatchStudentInput {
  name: string;
  rollNumber: string;
  files: File[];
}

export type BatchEvaluationResultItem =
  | ({
    index: number;
    status: 'success';
    studentId: string;
    recordId: string;
    studentName: string;
    rollNumber: string;
    totalScore: number;
    details: EvaluationDetail[];
    examinerJson?: unknown;
    weakAreas?: string[];
    overallConfidence?: number;
    mappingDetails?: MappingDetail[];
    ocrConfidence?: number;
    rawText?: string;
    pages?: OCRPageSummary[];
  })
  | ({
    index: number;
    status: 'error';
    studentName: string;
    rollNumber: string;
    error: string;
    details?: unknown;
  });

export interface BatchEvaluationResponse {
  results: BatchEvaluationResultItem[];
  summary: { successCount: number; failureCount: number };
}

export interface StudentRecord {
  _id: string;
  name: string;
  rollNumber: string;
  evaluatedMarks: { number: string; score: number; maxMarks: number }[];
  totalScore: number;
  status: 'pending' | 'evaluated';
  createdAt: string;
}

// Auth APIs
export async function signup(name: string, email: string, password: string): Promise<{ token: string; user: { id: string; name: string; email: string } }> {
  const data = await httpJson('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  setAuthToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<{ token: string; user: { id: string; name: string; email: string } }> {
  const data = await httpJson('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setAuthToken(data.token);
  return data;
}

// Upload Answer Key API -> /api/upload-key
export async function uploadAnswerKey(file: File): Promise<UploadKeyResponse> {
  const form = new FormData();
  form.append('file', file);
  return httpForm('/api/upload-key', form);
}

// Upload Student Sheet API -> /api/upload-sheet
export async function uploadStudentSheet(files: File | File[]): Promise<UploadSheetResponse> {
  const form = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((file) => form.append('files', file));
  return httpForm('/api/upload-sheet', form);
}

// Upload and Auto-Evaluate -> /api/upload-and-evaluate
export async function uploadAndEvaluate(files: File | File[], studentName: string, rollNumber: string, keyId: string): Promise<EvaluationResult & { rawText?: string; ocrConfidence?: number; pages?: OCRPageSummary[] }> {
  const form = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((file) => form.append('files', file));
  form.append('studentName', studentName);
  form.append('rollNumber', rollNumber);
  form.append('keyId', keyId);
  return httpForm('/api/upload-and-evaluate', form);
}

export async function batchUploadAndEvaluate(students: BatchStudentInput[], keyId: string): Promise<BatchEvaluationResponse> {
  if (!students.length) {
    throw new Error('At least one student is required');
  }

  const form = new FormData();
  form.append('keyId', keyId);

  let fileCursor = 0;

  const manifest = students.map((student, index) => {
    if (!student.name.trim() || !student.rollNumber.trim()) {
      throw new Error('Student name and roll number are required');
    }
    if (!student.files.length) {
      throw new Error(`No files provided for ${student.name}`);
    }

    const fileIndices = student.files.map((file) => {
      const idx = fileCursor;
      fileCursor += 1;
      form.append('files', file);
      return idx;
    });

    return {
      index,
      name: student.name,
      rollNumber: student.rollNumber,
      fileIndices,
    };
  });

  form.append('students', JSON.stringify(manifest));

  return httpForm('/api/upload-and-evaluate-batch', form);
}

// Evaluate Answers API -> /api/evaluate
export async function evaluateAnswers(params: { studentName: string; rollNo: string; keyId: string; answers: { number: string; answer: string }[] }): Promise<EvaluationResult> {
  const body = {
    student: { name: params.studentName, rollNumber: params.rollNo },
    keyId: params.keyId,
    answers: params.answers,
  };
  return httpJson('/api/evaluate', { method: 'POST', headers: { ...authHeaders() }, body: JSON.stringify(body) });
}

// Get Dashboard Data -> /api/students
export async function getDashboardData(q?: string): Promise<StudentRecord[]> {
  const url = new URL('/api/students', BASE_URL);
  if (q) url.searchParams.set('q', q);
  const res = await fetch(url.toString(), { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.students as StudentRecord[];
}

export async function getStudentById(id: string): Promise<StudentRecord | null> {
  const res = await fetch(`${BASE_URL}/api/students/${id}`, { headers: { ...authHeaders() } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.student as StudentRecord;
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/students/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export interface LatestEvaluationResponse {
  record: EvaluationResult;
}

export async function getLatestEvaluationByStudent(id: string): Promise<LatestEvaluationResponse> {
  const res = await fetch(`${BASE_URL}/api/evaluations/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LatestEvaluationResponse>;
}

// CSV Export -> /api/export-csv
export async function downloadCsv(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/export-csv`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gradify_students_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export to CSV
// keeping legacy export removed; use downloadCsv()
