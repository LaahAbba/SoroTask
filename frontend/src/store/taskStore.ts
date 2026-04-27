import { create } from "zustand";
import type { Task, TaskContent } from "@/src/types/task";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface TaskState {
  /** All tasks, keyed by id for O(1) lookup */
  tasks: Record<string, Task>;
  /** Ordered list of task ids (preserves insertion / sort order) */
  taskIds: string[];
  /** Currently selected task id */
  selectedTaskId: string | null;
  /** Async loading state */
  status: LoadingState;
  /** Last error message, if any */
  error: string | null;
}

export interface TaskActions {
  /** Replace the full task list (e.g. after a fetch) */
  setTasks: (tasks: Task[]) => void;
  /** Add a single task */
  addTask: (task: Task) => void;
  /** Update fields on an existing task */
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  /** Update only the rich-text description */
  updateTaskDescription: (id: string, description: TaskContent) => void;
  /** Remove a task */
  removeTask: (id: string) => void;
  /** Select a task (for detail view) */
  selectTask: (id: string | null) => void;
  /** Set loading state */
  setStatus: (status: LoadingState) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Reset store to initial state */
  reset: () => void;
}

export type TaskStore = TaskState & TaskActions;

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_STATE: TaskState = {
  tasks: {},
  taskIds: [],
  selectedTaskId: null,
  status: "idle",
  error: null,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTaskStore = create<TaskStore>((set) => ({
  ...INITIAL_STATE,

  setTasks(tasks) {
    const map: Record<string, Task> = {};
    const ids: string[] = [];
    for (const task of tasks) {
      map[task.id] = task;
      ids.push(task.id);
    }
    set({ tasks: map, taskIds: ids, error: null });
  },

  addTask(task) {
    set((state) => {
      if (state.tasks[task.id]) return state; // idempotent
      return {
        tasks: { ...state.tasks, [task.id]: task },
        taskIds: [...state.taskIds, task.id],
      };
    });
  },

  updateTask(id, patch) {
    set((state) => {
      const existing = state.tasks[id];
      if (!existing) return state;
      return {
        tasks: {
          ...state.tasks,
          [id]: { ...existing, ...patch, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  updateTaskDescription(id, description) {
    set((state) => {
      const existing = state.tasks[id];
      if (!existing) return state;
      return {
        tasks: {
          ...state.tasks,
          [id]: { ...existing, description, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  removeTask(id) {
    set((state) => {
      const { [id]: _removed, ...remaining } = state.tasks;
      return {
        tasks: remaining,
        taskIds: state.taskIds.filter((tid) => tid !== id),
        selectedTaskId:
          state.selectedTaskId === id ? null : state.selectedTaskId,
      };
    });
  },

  selectTask(id) {
    set({ selectedTaskId: id });
  },

  setStatus(status) {
    set({ status });
  },

  setError(error) {
    set({ error, status: error ? "error" : "idle" });
  },

  reset() {
    set(INITIAL_STATE);
  },
}));

// ── Selectors (memoisation-friendly) ─────────────────────────────────────────

/** Returns the ordered task array — stable reference when tasks haven't changed */
export function selectTaskList(state: TaskStore): Task[] {
  return state.taskIds.map((id) => state.tasks[id]).filter(Boolean);
}

/** Returns the currently selected task or null */
export function selectSelectedTask(state: TaskStore): Task | null {
  return state.selectedTaskId ? (state.tasks[state.selectedTaskId] ?? null) : null;
}
