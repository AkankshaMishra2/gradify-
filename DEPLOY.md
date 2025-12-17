# Deployment Guide (Render)

This project is configured for a **Unified Deployment** on **Render**. The frontend is built into static files and served by the backend Node.js server, allowing you to deploy the entire application as a single Web Service.

## Prerequisites

Ensure you have the following environment variables ready in your Render dashboard:

- `MONGODB_URI`: Your MongoDB connection string (e.g., MongoDB Atlas).
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `JWT_SECRET`: A strong secret key for authentication.
- `CORS_ORIGIN`: The URL of your deployed app (e.g., `https://gradify.onrender.com`).

## Deployment Steps

1.  **Push to GitHub**: Ensure your latest code is pushed to a GitHub repository.
2.  **Create a Web Service on Render**:
    - Go to [dashboard.render.com](https://dashboard.render.com).
    - Click **New +** -> **Web Service**.
    - Connect your GitHub repository.
3.  **Configure Settings**:
    - **Runtime**: Node
    - **Build Command**: `npm install && npm run build`
        - *Note: The `postinstall` script in `package.json` will automatically install backend dependencies.*
    - **Start Command**: `npm start`
4.  **Environment Variables**:
    - Add the variables listed in the Prerequisites section.
5.  **Deploy**: Click **Create Web Service**.

## How it Works

1.  **Build**: When `npm run build` runs, Vite builds the React frontend and outputs the files to `backend/public`.
2.  **Serve**: When `npm start` runs, the Node.js server (`backend/src/server.js`) starts. It is configured to serve the static files from `backend/public` and handle client-side routing (SPA) by returning `index.html` for unknown routes.
