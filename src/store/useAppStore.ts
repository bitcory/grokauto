import { create } from 'zustand';
import type {
  GenerationMode,
  TabType,
  VideoSettings,
  PromptImageMode,
} from '../types';

interface AppState {
  // UI
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Mode
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;

  // Control
  concurrentPrompts: number;
  setConcurrentPrompts: (n: number) => void;
  delayMin: number;
  delayMax: number;
  setDelay: (min: number, max: number) => void;

  // Prompt
  promptText: string;
  setPromptText: (text: string) => void;

  // Images
  uploadedImages: string[]; // data URLs
  setUploadedImages: (images: string[]) => void;
  addUploadedImage: (image: string) => void;
  removeUploadedImage: (index: number) => void;

  // Per-prompt image modes
  promptImageModes: PromptImageMode[];
  setPromptImageMode: (index: number, mode: PromptImageMode) => void;
  syncPromptImageModes: (promptCount: number) => void;

  // Output
  outputPerPrompt: number;
  setOutputPerPrompt: (n: number) => void;
  saveFolder: string;
  setSaveFolder: (folder: string) => void;
  autoRename: boolean;
  setAutoRename: (v: boolean) => void;

  // Settings
  videoSettings: VideoSettings;
  setVideoSettings: (s: Partial<VideoSettings>) => void;
  // Language
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;

  // Running state
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;

  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const STORAGE_KEY = 'grokauto_settings';

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'control',
  setActiveTab: (tab) => set({ activeTab: tab }),

  mode: 'text-to-image',
  setMode: (mode) => {
    const isVideo = mode === 'text-to-video' || mode === 'frame-to-video' || mode === 'remix-video';
    const defaultDelay = isVideo ? 15 : 5;
    set({ mode, delayMin: defaultDelay, delayMax: defaultDelay });
    get().saveToStorage();
  },

  concurrentPrompts: 1,
  setConcurrentPrompts: (n) => {
    set({ concurrentPrompts: n });
    get().saveToStorage();
  },

  delayMin: 5,
  delayMax: 5,
  setDelay: (min, max) => {
    set({ delayMin: min, delayMax: max });
    get().saveToStorage();
  },

  promptText: '',
  setPromptText: (text) => set({ promptText: text }),

  uploadedImages: [],
  setUploadedImages: (images) => set({ uploadedImages: images }),
  addUploadedImage: (image) =>
    set((s) => ({ uploadedImages: [...s.uploadedImages, image] })),
  removeUploadedImage: (index) =>
    set((s) => ({
      uploadedImages: s.uploadedImages.filter((_, i) => i !== index),
    })),

  promptImageModes: [],
  setPromptImageMode: (index, mode) =>
    set((s) => {
      const modes = [...s.promptImageModes];
      modes[index] = mode;
      return { promptImageModes: modes };
    }),
  syncPromptImageModes: (promptCount) =>
    set((s) => {
      const modes = [...s.promptImageModes];
      while (modes.length < promptCount) modes.push('new');
      return { promptImageModes: modes.slice(0, promptCount) };
    }),

  outputPerPrompt: 1,
  setOutputPerPrompt: (n) => {
    set({ outputPerPrompt: n });
    get().saveToStorage();
  },

  saveFolder: 'GrokAuto',
  setSaveFolder: (folder) => {
    set({ saveFolder: folder });
    get().saveToStorage();
  },

  autoRename: true,
  setAutoRename: (v) => {
    set({ autoRename: v });
    get().saveToStorage();
  },

  videoSettings: {
    aspectRatio: '16:9',
    duration: 5,
  },
  setVideoSettings: (s) =>
    set((state) => {
      const vs = { ...state.videoSettings, ...s };
      setTimeout(() => get().saveToStorage(), 0);
      return { videoSettings: vs };
    }),

  language: 'ko',
  setLanguage: (lang) => {
    set({ language: lang });
    get().saveToStorage();
  },

  isRunning: false,
  setIsRunning: (v) => set({ isRunning: v }),

  loadFromStorage: async () => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const data = result[STORAGE_KEY];
      if (data) {
        set({
          mode: data.mode ?? 'text-to-image',
          concurrentPrompts: data.concurrentPrompts ?? 1,
          delayMin: data.delayMin ?? 5,
          delayMax: data.delayMax ?? 5,
          outputPerPrompt: data.outputPerPrompt ?? 1,
          saveFolder: data.saveFolder ?? 'GrokAuto',
          autoRename: data.autoRename ?? true,
          language: data.language ?? 'ko',
          videoSettings: data.videoSettings ?? { aspectRatio: '16:9', duration: 5 },
        });
      }
    } catch {
      // Storage not available (e.g., in dev mode)
    }
  },

  saveToStorage: async () => {
    try {
      const s = get();
      await chrome.storage.local.set({
        [STORAGE_KEY]: {
          mode: s.mode,
          concurrentPrompts: s.concurrentPrompts,
          delayMin: s.delayMin,
          delayMax: s.delayMax,
          outputPerPrompt: s.outputPerPrompt,
          saveFolder: s.saveFolder,
          autoRename: s.autoRename,
          language: s.language,
          videoSettings: s.videoSettings,
        },
      });
    } catch {
      // Storage not available
    }
  },
}));
