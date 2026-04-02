# Gradify

**AI-Powered Automated Answer Sheet Evaluation**

Gradify is an advanced, automated grading system designed to streamline the evaluation of student answer sheets. Leveraging Artificial Intelligence and Optical Character Recognition (OCR), Gradify can digest scanned documents or images, extract the text, and evaluate the answers against a provided rubric using Google's Gemini AI.

## 🚀 Features

- **Automated Grading:** Uses AI to evaluate answers effectively.
- **OCR Integration:** Automatically extracts text from uploaded images/documents using Tesseract.
- **Multiple File Formats:** Supports various formats such as PDFs and images.
- **Modern User Interface:** Built with a beautiful and responsive UI.

## 💻 Tech Stack

### Frontend
- **React 18** with **Vite**
- **TypeScript**
- **Tailwind CSS** & **shadcn/ui** for modern, accessible components
- **Recharts** for data visualization
- **React Router** for navigation
- **React Hook Form** + **Zod** for form validation

### Backend
- **Node.js** & **Express**
- **MongoDB** with **Mongoose**
- **@google/generative-ai** (Gemini 2.5) for AI evaluation
- **tesseract.js** for optical character recognition (OCR)
- **multer** for file uploads
- **JSON Web Tokens (JWT)** & **bcrypt** for authentication

---

## 🛠️ Local Setup Instructions

Follow these steps to set up the project locally.

### Prerequisites
- [Node.js](https://nodejs.org/en) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a MongoDB Atlas URI)
- A Google Gemini API Key

### 1. Clone the repository

```bash
git clone <repository-url>
cd gradify-
```

### 2. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy the sample env file:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your details, notably:
     - `MONGO_URI`
     - `JWT_SECRET`
     - `GEMINI_API_KEY`
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend should now be running on `http://localhost:5000`.*

### 3. Frontend Setup

1. Open a new terminal and stay in the root directory (`gradify-`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend should now be running securely (usually on `http://localhost:5173`).*

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for features, bug fixes, or enhancements.
