import React from "react";
import { Task } from "../types";
import { Calendar, CheckCircle2, Circle, Clock, Edit3, Trash2 } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: Task["status"]) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange }) => {
  const isOverdue = () => {
    if (task.status === "completed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "low":
        default:
          return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const toggleStatus = () => {
    const nextStatus: Task["status"] = 
      task.status === "pending" ? "in_progress" : 
      task.status === "in_progress" ? "completed" : "pending";
    onStatusChange(task.id, nextStatus);
  };

  return (
    <div
      id={`task-card-${task.id}`}
      draggable
      onDragStart={handleDragStart}
      className={`bg-white rounded-2xl border p-5 transition-all duration-300 hover:shadow-md hover:border-slate-300 group cursor-grab active:cursor-grabbing ${
        task.status === "completed" ? "border-slate-100 opacity-75" : "border-slate-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={toggleStatus}
            className="mt-1 text-slate-400 hover:text-emerald-500 transition-colors focus:outline-hidden"
            title="Toggle Status"
          >
            {task.status === "completed" ? (
              <CheckCircle2 size={19} className="text-emerald-500 fill-emerald-50/50" />
            ) : task.status === "in_progress" ? (
              <Clock size={19} className="text-amber-500 animate-pulse" />
            ) : (
              <Circle size={19} />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-slate-800 break-words ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
              {task.title}
            </h4>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 break-words">
              {task.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {/* Category */}
        <span className="text-[11px] font-medium tracking-wide bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase">
          {task.category}
        </span>

        {/* Priority */}
        <span className={`text-[11px] font-semibold tracking-wide border px-2.5 py-0.5 rounded-full uppercase ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-3.5">
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar size={13} className={isOverdue() ? "text-rose-500" : "text-slate-400"} />
          <span className={`font-mono ${isOverdue() ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
            {task.dueDate} {isOverdue() && "(Overdue)"}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
            title="Edit Task"
          >
            <Edit3 size={15} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Delete Task"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
