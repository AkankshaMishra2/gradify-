import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { OCRResult, EvaluationResult, StudentRecord, login as apiLogin, signup as apiSignup, setAuthToken } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentOCRResult: OCRResult | null;
  currentEvaluation: EvaluationResult | null;
  uploadedKeyFile: File | null;
  answerKeyId?: string | null;
  uploadedSheetFiles: File[];
  students: StudentRecord[];
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setCurrentOCRResult: (result: OCRResult | null) => void;
  setCurrentEvaluation: (result: EvaluationResult | null) => void;
  setUploadedKeyFile: (file: File | null) => void;
  setAnswerKeyId: (id: string | null) => void;
  setUploadedSheetFiles: (files: File[]) => void;
  setStudents: (students: StudentRecord[]) => void;
  addStudent: (student: StudentRecord) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    currentOCRResult: null,
    currentEvaluation: null,
    uploadedKeyFile: null,
    uploadedSheetFiles: [],
    students: [],
    answerKeyId: null,
  });

  // Hydrate token & user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('gradify_token');
    const userRaw = localStorage.getItem('gradify_user');
    if (token) {
      setAuthToken(token);
    }
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        setState(prev => ({ ...prev, user, isAuthenticated: !!token }));
      } catch (error) {
        console.warn('Failed to hydrate stored user', error);
        localStorage.removeItem('gradify_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiLogin(email, password);
      setAuthToken(res.token);
      localStorage.setItem('gradify_token', res.token);
      localStorage.setItem('gradify_user', JSON.stringify(res.user));
      setState(prev => ({
        ...prev,
        user: { id: res.user.id, email: res.user.email, name: res.user.name },
        isAuthenticated: true,
      }));
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiSignup(name, email, password);
      setAuthToken(res.token);
      localStorage.setItem('gradify_token', res.token);
      localStorage.setItem('gradify_user', JSON.stringify(res.user));
      setState(prev => ({
        ...prev,
        user: { id: res.user.id, email: res.user.email, name: res.user.name },
        isAuthenticated: true,
      }));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setState(prev => ({
      ...prev,
      user: null,
      isAuthenticated: false,
    }));
    localStorage.removeItem('gradify_token');
    localStorage.removeItem('gradify_user');
    setAuthToken(null);
  };

  const setCurrentOCRResult = (result: OCRResult | null) => {
    setState(prev => ({ ...prev, currentOCRResult: result }));
  };

  const setCurrentEvaluation = (result: EvaluationResult | null) => {
    setState(prev => ({ ...prev, currentEvaluation: result }));
  };

  const setUploadedKeyFile = (file: File | null) => {
    setState(prev => ({ ...prev, uploadedKeyFile: file }));
  };

  const setAnswerKeyId = (id: string | null) => {
    setState(prev => ({ ...prev, answerKeyId: id }));
  };

  const setUploadedSheetFiles = (files: File[]) => {
    setState(prev => ({ ...prev, uploadedSheetFiles: files }));
  };

  const setStudents = (students: StudentRecord[]) => {
    setState(prev => ({ ...prev, students }));
  };

  const addStudent = (student: StudentRecord) => {
    setState(prev => ({ ...prev, students: [...prev.students, student] }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        setCurrentOCRResult,
        setCurrentEvaluation,
        setUploadedKeyFile,
        setAnswerKeyId,
        setUploadedSheetFiles,
        setStudents,
        addStudent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
