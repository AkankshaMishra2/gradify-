import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Frontend app starting...");

try {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  
  createRoot(root).render(<App />);
  console.log("Frontend app mounted successfully");
} catch (error) {
  console.error("Failed to mount frontend app:", error);
}
