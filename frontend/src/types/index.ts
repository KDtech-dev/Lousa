export type QuestionType = "single" | "boolean" | "open";
export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  institution: string;
}
export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
}
export interface Assessment {
  id: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  questions: Question[];
  materialIds: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Material {
  id: string;
  title: string;
  subject: string;
  type: "file" | "link";
  url?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}
export interface Application {
  id: string;
  assessmentId: string;
  snapshot: Assessment;
  code: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  accessMode: "name" | "email";
  allowedEmails: string[];
  appRequired: boolean;
  status: "published" | "closed";
  createdAt: string;
}
export interface Answer {
  questionId: string;
  value: string;
  pointsAwarded?: number;
  feedback?: string;
}
export interface Attempt {
  id: string;
  applicationId: string;
  name: string;
  email?: string;
  identifier: string;
  startedAt: string;
  deadlineAt: string;
  endedAt?: string;
  status: "in_progress" | "submitted" | "abandoned" | "expired";
  correctionStatus: "pending" | "graded";
  resultsReleased: boolean;
  answers: Record<string, Answer>;
  feedback: string;
  score: number | null;
}
export type PublicQuestion = Omit<Question, "correctAnswer">;
export type PublicAssessment = Omit<
  Assessment,
  "questions" | "archived" | "createdAt" | "updatedAt"
> & { questions: PublicQuestion[] };
export type PublicApplication = Omit<
  Application,
  "snapshot" | "allowedEmails" | "assessmentId"
> & { snapshot: PublicAssessment };
export type PublicAttempt = Omit<Attempt, "answers" | "score" | "feedback"> & {
  answers: Record<string, Pick<Answer, "questionId" | "value">>;
  score?: number | null;
  feedback?: string;
  answerFeedback?: Record<string, string>;
};
export type NativeAppState =
  "pending" | "not_installed" | "incompatible" | "ready" | "disconnected";
export interface ApplicationInput {
  assessmentId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  accessMode: "name" | "email";
  allowedEmails: string[];
  appRequired: boolean;
}
export interface DemoDatabase {
  teacher: Teacher;
  assessments: Assessment[];
  materials: Material[];
  applications: Application[];
  attempts: Attempt[];
}
