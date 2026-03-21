import { create } from 'zustand';
import type { PromptItem, PromptStatus } from '../types';

interface QueueState {
  items: PromptItem[];
  setItems: (items: PromptItem[]) => void;
  addItem: (item: PromptItem) => void;
  updateItemStatus: (id: string, status: PromptStatus, error?: string) => void;
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
        item.id === id ? { ...item, status, error } : item
      ),
    })),

  clearItems: () => set({ items: [] }),

  activeCount: () => get().items.filter((i) => i.status === 'running').length,

  completedCount: () =>
    get().items.filter((i) => i.status === 'completed').length,

  failedCount: () => get().items.filter((i) => i.status === 'failed').length,
}));
