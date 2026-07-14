import { apiClient } from './apiClient';

export interface Certificate {
  id: string;
  course_title?: string;
  instructor_name?: string;
  certificate_code: string;
  issued_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const certificateService = {
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Certificate>>('/certificates/', { params });
    return data;
  },
  async claim(courseId: string) {
    const { data } = await apiClient.post<Certificate>('/certificates/claim/', { course: courseId });
    return data;
  },
};
