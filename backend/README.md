# Gradify Backend

Production-ready backend for Gradify – AI-Powered Automated Answer Sheet Evaluation.

## Stack
- Node.js, Express.js
- MongoDB with Mongoose
- JWT Auth (bcrypt)
- Multer for uploads
- Tesseract.js OCR
- OpenAI API for evaluation
- csv-writer for CSV export
- Zod for input validation
- Helmet, CORS, compression, rate limiting

## Setup
1. Install dependencies:
```powershell
cd "c:\Users\HP\Desktop\gradify-frontend\backend"
npm install
```
2. Create `.env` from `.env.example` and fill values.
3. Start MongoDB locally or set `MONGO_URI` to your cluster.
4. Run the server:
```powershell
npm run dev
```

## API Routes
- POST `/auth/signup` { name, email, password }
- POST `/auth/login` { email, password }
- POST `/api/upload-key` (auth, multipart `file`)
- POST `/api/upload-sheet` (auth, multipart `file`)
- POST `/api/evaluate` (auth) body: { student: { name, rollNumber }, keyId, answers: [{ number, answer }] }
- GET `/api/students` (auth) ?q=&status=
- GET `/api/export-csv` (auth)

All responses are JSON except CSV stream.
