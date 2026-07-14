import { apiClient } from './apiClient';

export interface Resource {
  id: string;
  title: string;
  kind: string;
  description: string;
  file: string;
  file_url: string;
  file_download_url: string;
  lesson: string;
  created_at: string;
}

export interface LessonContent {
  id: string;
  module: string;
  title: string;
  content: string;
  lesson_type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'DOWNLOAD' | 'LIVE';
  video_url: string | null;
  video_file: string | null;
  video: string;
  transcript: string;
  instructor_notes: string;
  duration_seconds: number;
  order: number;
  is_preview: boolean;
  resources: Resource[];
  status: string;
  ai_generated: boolean;
  comments: unknown[];
  content_blocks: unknown[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  learning_objectives: string[];
  estimated_minutes: number;
  is_published: boolean;
  require_quiz_pass_to_continue: boolean;
  order: number;
  course: string;
  lessons: LessonContent[];
  prerequisite_modules: string[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  category: string;
  category_id: string;
  category_slug: string;
  level: string;
  language: string;
  thumbnail: string;
  thumbnail_url: string;
  thumbnail_file: string | null;
  estimated_hours: number | null;
  hours_for_certificate: number;
  price: string;
  platform_fee_percentage: string;
  instructor: string;
  instructor_name?: string;
  is_published: boolean;
  average_rating?: number | null;
  enrollments_count?: number;
  learning_objectives: string[];
  prerequisites: string[];
  target_audience: string[];
  tags: string[];
  completion_criteria: string;
  passing_score_percent: number;
  certificate_template: Record<string, unknown>;
  modules: Module[];
  sections: unknown[];
  reviews: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student: string;
  course: string;
  course_title: string;
  thumbnail?: string;
  instructor_name?: string;
  is_active: boolean;
  purchased_at: string;
}

export interface Progress {
  id: string;
  enrollment: string;
  lesson: string;
  lesson_title?: string;
  completion: string;
  is_completed: boolean;
  updated_at: string;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const enrollmentService = {
  async createEnrollment(courseId: string) {
    const { data } = await apiClient.post<Enrollment>('/enrollments/', { course: courseId });
    return data;
  },
  async listEnrollments(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Enrollment>>('/enrollments/', { params });
    return data;
  },
};

export const courseService = {
  async listCourses(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Course>>('/courses/', { params });
    return data;
  },
  async getCourse(id: string) {
    const { data } = await apiClient.get<Course>(`/courses/${id}/`);
    return data;
  },
  async listProgress(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Progress>>('/progress/', { params });
    return data;
  },
  async upsertProgress(existingId: string | null, payload: { enrollment: string; lesson: string; completion: number; is_completed: boolean; last_position_seconds?: number }) {
    if (existingId) {
      const { data } = await apiClient.patch<Progress>(`/progress/${existingId}/`, payload);
      return data;
    }
    const { data } = await apiClient.post<Progress>('/progress/', payload);
    return data;
  },
  async listCertificates(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Certificate>>('/certificates/', { params });
    return data;
  },
  async claimCertificate(courseId: string) {
    const { data } = await apiClient.post<Certificate>('/certificates/claim/', { course: courseId });
    return data;
  },
};

export interface Certificate {
  id: string;
  course: string;
  course_title?: string;
  instructor_name?: string;
  certificate_code: string;
  issued_at: string;
}
