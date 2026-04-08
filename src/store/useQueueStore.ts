import { create } from 'zustand';
import type { PromptItem, PromptStatus } from '../types';

interface QueueState {
  items: PromptItem[];
  setItems: (items: PromptItem[]) => void;
  addItem: (item: PromptItem) => void;
  updateItemStatus: (id: string, status: PromptStatus, error?: string) => void;
  updateItemProgress: (id: string, progress?: number, phase?: PromptItem['phase']) => void;
  removeItems: (ids: string[]) => void;
  clearItems: () => void;
  activeCount: () => number;
  completedCount: () => number;
  failedCount: () => number;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],

  setItems: (items) => set({ items }),

  addItem: (item) => set((s) => ({ items: [...s.items, item] })),

  updateItemStatus: (id, status, error) =>
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id ? { ...item, status, error, progress: undefined } : item
      ),
    })),

  updateItemProgress: (id, progress, phase) =>
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...(progress != null ? { progress } : {}),
              ...(phase != null ? { phase } : {}),
            }
          : item
      ),
    })),

  removeItems: (ids: string[]) =>
    set((s) => ({ items: s.items.filter((item) => !ids.includes(item.id)) })),

  clearItems: () => set({ items: [] }),

  activeCount: () => get().items.filter((i) => i.status === 'running').length,

  completedCount: () =>
    get().items.filter((i) => i.status === 'completed').length,

  failedCount: () => get().items.filter((i) => i.status === 'failed').length,
}));
