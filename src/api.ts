import { Task, User, AuthResponse, DashboardStats } from "./types";

const getHeaders = () => {
  const token = localStorage.getItem("task_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth endpoints
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }
    return res.json();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    return res.json();
  },

  async getGoogleAuthUrl(): Promise<{ url: string }> {
    const res = await fetch("/api/auth/google/url");
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to get Google Authentication URL. Please verify configuration.");
    }
    return res.json();
  },

  // Task endpoints
  async getTasks(): Promise<Task[]> {
    const res = await fetch("/api/tasks", { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("task_auth_token");
        localStorage.removeItem("task_user");
        window.location.reload();
      }
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch tasks");
    }
    return res.json();
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create task");
    }
    return res.json();
  },

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update task");
    }
    return res.json();
  },

  async deleteTask(id: string): Promise<{ message: string }> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete task");
    }
    return res.json();
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch("/api/stats", { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch stats");
    }
    return res.json();
  },
};
