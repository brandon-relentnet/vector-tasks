import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

export interface Project {
  id: number;
  name: string;
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
    const [tasksRes, projectsRes, dailyRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/projects'),
      api.get('/daily-log'),
    ]);

    const tasks: Task[] = tasksRes.data;
    const projects: Project[] = projectsRes.data;
    const dailyLog = dailyRes.data;

    const today = new Date().toISOString().split('T')[0];

    // Calculate XP (tasks done today)
    const xp = tasks
      .filter(t => t.status === 'Done' && t.updated_at.startsWith(today))
      .length * 10; 

    // Active Quests (not Done)
    const quests = tasks
      .filter(t => t.status !== 'Done')
      .sort((a, b) => {
        const priorityMap: any = { 'High': 3, 'Med': 2, 'Low': 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });

    // Recent Completed Quests (Done today)
    const history = tasks
      .filter(t => t.status === 'Done' && t.updated_at.startsWith(today))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Projects with active counts
    const projectsWithCounts = projects.map(p => ({
      ...p,
      active_count: tasks.filter(t => t.project_id === p.id && t.status !== 'Done').length
    }));

    return {
      xp,
      quests: quests.slice(0, 5),
      history,
      projects: projectsWithCounts,
      dailyLog
    };
  } catch (error) {
    console.error('API Error:', error);
    return { xp: 0, quests: [], projects: [], dailyLog: null };
  }
};

export const getBriefingHistory = async (params?: { limit?: number; offset?: number; has_morning?: boolean; has_night?: boolean }) => {
  try {
    const response = await api.get('/daily-log/history', { params });
    return response.data;
  } catch (error) {
    console.error('History API Error:', error);
    return [];
  }
};

export const updateTaskStatus = async (taskId: number, status: string) => {
  try {
    const response = await api.patch(`/tasks/${taskId}`, { status });
    return response.data;
  } catch (error) {
    console.error('Update Task Error:', error);
    throw error;
  }
};

export const createTask = async (task: Partial<Task>) => {
  try {
    const response = await api.post('/tasks', task);
    return response.data;
  } catch (error) {
    console.error('Create Task Error:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: number) => {
  try {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    console.error('Delete Task Error:', error);
    throw error;
  }
};
