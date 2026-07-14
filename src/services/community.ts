import { apiClient } from './apiClient';
import { buildWebSocketUrl } from './realtime';

export interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  likes_count: number;
  author_name?: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  next_session_at?: string | null;
  members_count?: number;
  members?: string[];
  created_by?: string;
}

export interface StudyGroupMessage {
  id: string;
  group: string;
  sender: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const communityService = {
  async listDiscussions(): Promise<Discussion[]> {
    const { data } = await apiClient.get<Paginated<Discussion>>('/discussions/');
    return data.results ?? [];
  },
  async listStudyGroups(): Promise<StudyGroup[]> {
    const { data } = await apiClient.get<Paginated<StudyGroup>>('/study-groups/');
    return data.results ?? [];
  },
  async createDiscussion(payload: { title: string; content: string; category?: string; tags?: string[] }): Promise<Discussion> {
    const { data } = await apiClient.post<Discussion>('/discussions/', payload);
    return data;
  },
  async getStudyGroup(groupId: string): Promise<StudyGroup> {
    const { data } = await apiClient.get<StudyGroup>(`/study-groups/${groupId}/`);
    return data;
  },
  async createStudyGroup(payload: { name: string; description: string }): Promise<StudyGroup> {
    const { data } = await apiClient.post<StudyGroup>('/study-groups/', payload);
    return data;
  },
  async joinStudyGroup(groupId: string): Promise<{ joined: boolean; members_count: number }> {
    const { data } = await apiClient.post<{ joined: boolean; members_count: number }>(`/study-groups/${groupId}/join/`);
    return data;
  },
  async listStudyGroupMessages(groupId: string): Promise<StudyGroupMessage[]> {
    const { data } = await apiClient.get<Paginated<StudyGroupMessage>>(`/study-group-messages/?group=${groupId}`);
    return data.results ?? [];
  },
  async sendStudyGroupMessage(group: string, content: string): Promise<StudyGroupMessage> {
    const { data } = await apiClient.post<StudyGroupMessage>('/study-group-messages/', { group, content });
    return data;
  },
  async createCommunitySocket(): Promise<WebSocket> {
    const url = await buildWebSocketUrl('/ws/community/');
    return new WebSocket(url);
  },
  async createStudyGroupSocket(groupId: string): Promise<WebSocket> {
    const url = await buildWebSocketUrl(`/ws/community/groups/${groupId}/`);
    return new WebSocket(url);
  },
};
