import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

export interface Project {
  id: number;
  name: str;
  description: string;
  category: string;
  active_count?: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  project_id: number;
  subtasks: any[];
  nudge_count?: number;
  created_at: string;
  updated_at: string;
}

export const getDashboardData = async () => {
  try {
    const [tasksRes, projectsRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/projects'),
    ]);

    const tasks: Task[] = tasksRes.data;
    const projects: Project[] = projectsRes.data;

    // Calculate XP (tasks done today)
    const today = new Date().toISOString().split('T')[0];
    const xp = tasks
      .filter(t => t.status === 'Done' && t.updated_at.startsWith(today))
      .length * 10; // Assuming 10 XP per task for now

    // Active Quests (not Done)
    const quests = tasks
      .filter(t => t.status !== 'Done')
      .sort((a, b) => {
        const priorityMap: any = { 'High': 3, 'Med': 2, 'Low': 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      })
      .slice(0, 5);

    // Projects with active counts
    const projectsWithCounts = projects.map(p => ({
      ...p,
      active_count: tasks.filter(t => t.project_id === p.id && t.status !== 'Done').length
    }));

    return {
      xp,
      quests,
      projects: projectsWithCounts
    };
  } catch (error) {
    console.error('API Error:', error);
    return { xp: 0, quests: [], projects: [] };
  }
};
