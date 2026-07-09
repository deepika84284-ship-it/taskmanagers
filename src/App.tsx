import React, { useState, useEffect, useMemo } from "react";
import { Task, User, DashboardStats as StatsType, TaskPriority, TaskStatus } from "./types";
import { api } from "./api";
import { DashboardStats } from "./components/DashboardStats";
import { TaskCard } from "./components/TaskCard";
import { TaskModal } from "./components/TaskModal";
import { 
  Plus, 
  Search, 
  LogOut, 
  Filter, 
  ArrowUpDown, 
  Sparkles, 
  List, 
  Columns, 
  PlusCircle, 
  HelpCircle,
  TrendingUp,
  LayoutGrid,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

export default function App() {
  // Auth state - Auto Bypass for direct seamless access
  const [user, setUser] = useState<User | null>({
    id: "default-user",
    name: "Guest User",
    email: "guest@example.com",
    createdAt: new Date().toISOString()
  });
  const [token, setToken] = useState<string | null>("default-token");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App core state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<StatsType>({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    completedPercentage: 0,
    byPriority: { low: 0, medium: 0, high: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "pending", "in_progress", "completed", "overdue"
  const [priorityFilter, setPriorityFilter] = useState<string>("all"); // "all", "low", "medium", "high"
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate-asc"); // "dueDate-asc", "dueDate-desc", "priority-desc", "priority-asc", "title-asc"
  const [viewLayout, setViewLayout] = useState<"board" | "grid">("board"); // "board" (column Kanban) or "grid" (single list flow)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Fetch app data immediately on mount (Auth bypassed)
  useEffect(() => {
    fetchAppData();
  }, []);

  const fetchAppData = async () => {
    setLoading(true);
    setError("");
    try {
      const fetchedTasks = await api.getTasks();
      setTasks(fetchedTasks);
      await fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to load task manager data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const fetchedStats = await api.getStats();
      setStats(fetchedStats);
    } catch (err) {
      console.error("Failed to load statistics", err);
    }
  };

  // Auth actions
  const handleGoogleConnect = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const { url } = await api.getGoogleAuthUrl();

      const popupWidth = 500;
      const popupHeight = 600;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;

      const authWindow = window.open(
        url,
        "google_oauth_popup",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
      );

      if (!authWindow) {
        throw new Error("Popup blocked! Please allow popups for this site to log in with Google.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to start Google Sign-In");
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      let response;
      if (authMode === "register") {
        if (!authName.trim()) {
          throw new Error("Name is required");
        }
        response = await api.register(authName, authEmail, authPassword);
      } else {
        response = await api.login(authEmail, authPassword);
      }

      localStorage.setItem("task_auth_token", response.token);
      localStorage.setItem("task_user", JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);

      // Clear auth forms
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("task_auth_token");
    localStorage.removeItem("task_user");
    setToken(null);
    setUser(null);
    setTasks([]);
  };

  // Task CRUD handlers
  const handleCreateOrUpdateTask = async (taskData: Partial<Task>) => {
    try {
      if (taskToEdit) {
        const updated = await api.updateTask(taskToEdit.id, taskData);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await api.createTask(taskData);
        setTasks((prev) => [created, ...prev]);
      }
      await fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to save task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to delete task");
    }
  };

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    try {
      const updated = await api.updateTask(id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await fetchStats();
    } catch (err: any) {
      setError(err.message || "Failed to update task status");
    }
  };

  // Drag-and-drop actions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== columnStatus) {
      await handleStatusChange(taskId, columnStatus);
    }
  };

  // Extract all categories dynamically for category list filter
  const categories = useMemo(() => {
    const list = tasks.map((t) => t.category.trim());
    return ["all", ...Array.from(new Set(list))];
  }, [tasks]);

  // Filter & Sort Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Search filter
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        let matchesStatus = true;
        if (statusFilter !== "all") {
          if (statusFilter === "overdue") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(task.dueDate);
            due.setHours(0, 0, 0, 0);
            matchesStatus = task.status !== "completed" && due < today;
          } else {
            matchesStatus = task.status === statusFilter;
          }
        }

        // Priority filter
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

        // Category filter
        const matchesCategory = categoryFilter === "all" || task.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim();

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        switch (sortBy) {
          case "dueDate-asc":
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          case "dueDate-desc":
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          case "priority-desc":
            return priorityWeight[b.priority] - priorityWeight[a.priority];
          case "priority-asc":
            return priorityWeight[a.priority] - priorityWeight[b.priority];
          case "title-asc":
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  // Split tasks by status for Kanban Board mode
  const tasksByStatus = useMemo(() => {
    return {
      pending: filteredTasks.filter((t) => t.status === "pending"),
      in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
      completed: filteredTasks.filter((t) => t.status === "completed"),
    };
  }, [filteredTasks]);

  // Authentication checks removed (guest mode enabled by default)

  // Authenticated State View
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Navbar Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <h1 className="text-lg font-bold font-display text-slate-800 tracking-tight">Task Workspace</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Workspace</p>
              <p className="text-sm font-semibold text-slate-700">{user?.name || "Guest User"}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold border border-indigo-200">
              {user?.name ? user.name[0].toUpperCase() : "G"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Handling Notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <AlertCircle size={18} />
              </div>
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dynamic Statistics Block */}
        <DashboardStats stats={stats} />

        {/* Actions & Filters Dashboard Bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 mb-6">
          <div className="flex flex-col gap-4">
            
            {/* Top Row: Search and Create Button */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks by title or description..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Layout switch triggers */}
                <div className="bg-slate-50 p-1 rounded-xl flex items-center border border-slate-100">
                  <button
                    onClick={() => setViewLayout("board")}
                    className={`p-1.5 rounded-lg transition-colors ${viewLayout === "board" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
                    title="Kanban Board"
                  >
                    <Columns size={16} />
                  </button>
                  <button
                    onClick={() => setViewLayout("grid")}
                    className={`p-1.5 rounded-lg transition-colors ${viewLayout === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
                    title="Grid Layout"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
                >
                  <Plus size={16} />
                  <span>Create Task</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Detailed Filters & Sorts */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50">
              
              {/* Status Select */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 focus:outline-hidden pr-2 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Priority Select */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 focus:outline-hidden pr-2 cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Category Select */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tag/Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 focus:outline-hidden pr-2 cursor-pointer capitalize"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all" ? "All Tags" : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Action */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 ml-auto">
                <ArrowUpDown size={12} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 focus:outline-hidden pr-2 cursor-pointer"
                >
                  <option value="dueDate-asc">Due Date: Soonest</option>
                  <option value="dueDate-desc">Due Date: Latest</option>
                  <option value="priority-desc">Priority: High to Low</option>
                  <option value="priority-asc">Priority: Low to High</option>
                  <option value="title-asc">Title: A-Z</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Loader State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 mt-4">Syncing with task server...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          /* Empty State View */
          <div id="empty-tasks-state" className="bg-white rounded-2xl border border-slate-100 text-center py-16 px-4">
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
              <Filter size={32} />
            </div>
            <h3 className="text-lg font-semibold font-display text-slate-800">No tasks found</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1.5">
              Try adjusting your active filters, refining your search phrase, or create a brand new task.
            </p>
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <PlusCircle size={16} />
              <span>Add Your First Task</span>
            </button>
          </div>
        ) : viewLayout === "board" ? (
          /* Kanban Board Columns */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Column: Pending */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "pending")}
              className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/40 min-h-[500px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pending</h4>
                </div>
                <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {tasksByStatus.pending.length}
                </span>
              </div>
              <div className="space-y-3.5 flex-1">
                {tasksByStatus.pending.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setTaskToEdit(t);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {tasksByStatus.pending.length === 0 && (
                  <div className="border border-dashed border-slate-300 rounded-2xl h-24 flex items-center justify-center text-xs text-slate-400">
                    Drag tasks here
                  </div>
                )}
              </div>
            </div>

            {/* Column: In Progress */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "in_progress")}
              className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/40 min-h-[500px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">In Progress</h4>
                </div>
                <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {tasksByStatus.in_progress.length}
                </span>
              </div>
              <div className="space-y-3.5 flex-1">
                {tasksByStatus.in_progress.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setTaskToEdit(t);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {tasksByStatus.in_progress.length === 0 && (
                  <div className="border border-dashed border-slate-300 rounded-2xl h-24 flex items-center justify-center text-xs text-slate-400">
                    Drag tasks here
                  </div>
                )}
              </div>
            </div>

            {/* Column: Completed */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "completed")}
              className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/40 min-h-[500px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Completed</h4>
                </div>
                <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {tasksByStatus.completed.length}
                </span>
              </div>
              <div className="space-y-3.5 flex-1">
                {tasksByStatus.completed.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setTaskToEdit(t);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {tasksByStatus.completed.length === 0 && (
                  <div className="border border-dashed border-slate-300 rounded-2xl h-24 flex items-center justify-center text-xs text-slate-400">
                    Drag tasks here
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Single Flow Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => {
                  setTaskToEdit(t);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>

      {/* Task Custom Editor / Builder Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={handleCreateOrUpdateTask}
        taskToEdit={taskToEdit}
      />
    </div>
  );
}
