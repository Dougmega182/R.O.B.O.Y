"use client";

import { useWidgetData } from "@/lib/hooks/useWidgetData";
import { TasksResponse, isTasksResponse } from "@/lib/contracts/tasks";
import { tasksStore } from "@/lib/stores/tasksStore";

export default function TasksWidget() {
  const { data, loading, error, refresh } = useWidgetData<TasksResponse>(
    "/api/tasks",
    isTasksResponse,
    tasksStore,
    15000 // 🚀 Poll every 15 seconds
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Today's Tasks</h2>
        <button
          onClick={refresh}
          className="text-sm px-3 py-1 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
        {loading && <p className="animate-pulse">Loading...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        
        {data && data.tasks && (
          <ul className="w-full space-y-3 mt-2">
            {data.tasks.map((task) => (
              <li 
                key={task.id} 
                className="flex items-center p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <div className={`w-5 h-5 rounded border-2 mr-4 ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}></div>
                <span className={`text-slate-200 ${task.completed ? 'line-through text-slate-500' : ''}`}>
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

