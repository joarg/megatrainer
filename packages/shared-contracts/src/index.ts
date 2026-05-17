// Shared types used across frontend and backend

export type QuestionCategory = "privacy" | "programme" | "other";

export type User = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  genderNotes: string | null;
  location: string | null;
  country: string | null;
  sport: string;
  trainingBackground: string[];
  performanceMetrics: string[];
  injuries: string[];
  motivations: string[];
  goals: string[];
  pendingQsAndComments: string[];
  followUp: string | null;
  experienceLevel: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InterviewSession = {
  id: string;
  userId: string;
  currentPhase:
    | "greeting"
    | "basicInfo"
    | "followUp"
    | "qAndA"
    | "goalAssessment"
    | "completed";
  currentAttempt: number;
  status: "in_progress" | "completed" | "abandoned";
  personalityVariant: string;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};

export type InterviewMessage = {
  id: string;
  sessionId: string;
  phase: string;
  attempt: number;
  userMessage: string;
  llmResponse: string;
  classifiedCategory?: QuestionCategory;
  createdAt: Date;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export type ApiError = {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
};

export type HealthResponse = {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  database: "ok" | "error";
  ollama: "ok" | "error";
  environment: string;
};

export type Trainer = {
  id: string;
  name: string;
  personality: string;
  sports: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTrainerRequest = {
  name: string;
  personality: string;
  sports: string[];
  language: string;
};
