import { apiClient } from './apiClient';

export interface Review {
  id: string;
  course: string;
  user: string;
  user_name?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const reviewService = {
  async list(courseId: string) {
    const { data } = await apiClient.get<Paginated<Review>>('/reviews/', { params: { course: courseId } });
    return data;
  },
  async create(payload: { course: string; rating: number; comment: string }) {
    const { data } = await apiClient.post<Review>('/reviews/', payload);
    return data;
  },
};
