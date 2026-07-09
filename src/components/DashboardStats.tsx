import React from "react";
import { DashboardStats as StatsType } from "../types";
import { CheckCircle2, Circle, Clock, Flame, ListTodo } from "lucide-react";

interface DashboardStatsProps {
  stats: StatsType;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
      {/* Total Tasks */}
      <div id="stats-total-card" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">Total Tasks</p>
          <h3 className="text-3xl font-semibold font-display text-slate-800 mt-1">{stats.total}</h3>
          <p className="text-xs text-slate-500 mt-2">Active in workspace</p>
        </div>
        <div className="p-3.5 bg-slate-50 text-slate-600 rounded-xl">
          <ListTodo size={24} />
        </div>
      </div>

      {/* Completed % */}
      <div id="stats-completed-card" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">Completion Rate</p>
            <h3 className="text-3xl font-semibold font-display text-emerald-600 mt-1">{stats.completedPercentage}%</h3>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.completedPercentage}%` }}
          />
        </div>
      </div>

      {/* In Progress */}
      <div id="stats-progress-card" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">In Progress</p>
          <h3 className="text-3xl font-semibold font-display text-amber-600 mt-1">{stats.inProgress}</h3>
          <p className="text-xs text-slate-500 mt-2">Actively being worked on</p>
        </div>
        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
          <Clock size={24} />
        </div>
      </div>

      {/* Pending Tasks */}
      <div id="stats-pending-card" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">Pending</p>
          <h3 className="text-3xl font-semibold font-display text-blue-600 mt-1">{stats.pending}</h3>
          <p className="text-xs text-slate-500 mt-2">Waiting to be started</p>
        </div>
        <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
          <Circle size={24} />
        </div>
      </div>
    </div>
  );
};
