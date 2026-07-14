import { apiClient } from './apiClient';

export interface UserStats {
  courses_in_progress: number;
  courses_completed: number;
  lessons_completed: number;
  lessons_completed_today: number;
  streak_days: number;
  total_focus_minutes: number;
  average_quiz_score: number;
  total_ai_tokens_used: number;
  skills_earned: string[];
  last_activity: string | null;
}

export interface Activity {
  id: string;
  kind: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Assignment {
  id: string;
  course: string;
  course_title?: string;
  title: string;
  description: string;
  due_date: string;
  points: number;
  type: string;
}

export interface Submission {
  id: string;
  assignment: string;
  assignment_title?: string;
  student: string;
  student_name?: string;
  course_id?: string;
  course_title?: string;
  grade?: string | null;
  status: string;
  feedback?: string;
  content_text?: string;
  file_url?: string;
  submitted_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  order: number;
}

export interface QuizAttempt {
  id: string;
  quiz: string;
  score: string;
  passed: boolean;
  submitted_at?: string;
}

export interface RecommendedCourse {
  id: string;
  title: string;
  thumbnail_url: string;
  category_name: string | null;
  level: string;
  average_rating: number;
  reason: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const learningService = {
  async getStats() {
    const { data } = await apiClient.get<UserStats>('/me/stats/');
    return data;
  },
  async listActivities(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Activity>>('/activities/', { params });
    return data;
  },
  async getRecommendedCourses() {
    const { data } = await apiClient.get<RecommendedCourse[]>('/courses/recommended/');
    return data;
  },
  async listAssignments(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Assignment>>('/assignments/', { params });
    return data;
  },
  async listSubmissions(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Submission>>('/submissions/', { params });
    return data;
  },
  async getQuiz(id: string) {
    const { data } = await apiClient.get<Quiz>(`/quizzes/${id}/`);
    return data;
  },
  async submitQuizAttempt(payload: { quiz: string; answers: Record<string, number> }) {
    const { data } = await apiClient.post<QuizAttempt>('/quiz-attempts/', payload);
    return data;
  },
  async listQuizAttempts(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<QuizAttempt>>('/quiz-attempts/', { params });
    return data;
  },
  async listQuizzesByModule(moduleId: string) {
    const { data } = await apiClient.get<Paginated<Quiz>>('/quizzes/', { params: { module: moduleId } });
    return data;
  },
  async listQuizzesByLesson(lessonId: string) {
    const { data } = await apiClient.get<Paginated<Quiz>>('/quizzes/', { params: { lesson: lessonId } });
    return data;
  },
  async getAssignment(id: string) {
    const { data } = await apiClient.get<Assignment>(`/assignments/${id}/`);
    return data;
  },
  async createSubmission(payload: { assignment: string; content_text?: string; file_url?: string }) {
    const { data } = await apiClient.post<Submission>('/submissions/', payload);
    return data;
  },
  async gradeSubmission(id: string, payload: { grade: string; feedback?: string; status?: string }) {
    const { data } = await apiClient.post<Submission>(`/submissions/${id}/grade/`, payload);
    return data;
  },
  async createAssignment(payload: { course: string; title: string; description: string; due_date: string; points: number; type: string }) {
    const { data } = await apiClient.post<Assignment>('/assignments/', payload);
    return data;
  },
};
