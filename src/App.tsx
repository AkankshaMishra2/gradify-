import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import UploadKey from "./pages/UploadKey";
import UploadSheet from "./pages/UploadSheet";
import OCRResult from "./pages/OCRResult";
import Evaluation from "./pages/Evaluation";
import NotFound from "./pages/NotFound";
import StudentDetail from "./pages/StudentDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload-key" element={<UploadKey />} />
            <Route path="/upload-sheet" element={<UploadSheet />} />
            <Route path="/ocr-result" element={<OCRResult />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
