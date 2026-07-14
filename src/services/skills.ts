import { apiClient } from './apiClient';

export interface SkillTreeNode {
  id: string;
  title: string;
  description: string;
  position_x: number;
  position_y: number;
  depth: number;
  status: 'LOCKED' | 'UNLOCKED' | 'COMPLETED';
  course: string | null;
}

export interface SkillTreeEdge {
  id: string;
  parent: string;
  child: string;
}

export interface SkillTreeData {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const skillService = {
  async listSkillTrees() {
    const { data } = await apiClient.get<Paginated<SkillTreeData>>('/skill-trees/');
    return data.results ?? [];
  },
  async generateSkillTree() {
    const { data } = await apiClient.post<SkillTreeData>('/skill-trees/generate/');
    return data;
  },
  async unlockNextNode(treeId: string, nodeId: string) {
    const { data } = await apiClient.post<SkillTreeNode>(`/skill-trees/${treeId}/unlock_next/`, { node_id: nodeId });
    return data;
  },
};
