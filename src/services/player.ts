import { apiClient } from './apiClient';
import type { Resource, LessonContent } from './courses';

export type { LessonContent as Lesson };

export const playerService = {
  async getLesson(id: string) {
    const { data } = await apiClient.get<LessonContent>(`/lessons/${id}/`);
    return data;
  },
};
