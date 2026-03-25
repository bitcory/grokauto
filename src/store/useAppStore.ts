import { create } from 'zustand';
import type {
  GenerationMode,
  TabType,
  VideoSettings,
  PromptImageMode,
  VideoDownloadQuality,
  ImageDownloadQuality,
  ImageFrameMode,
  ResizeRatio,
} from '../types';

const DEFAULTS = {
  mode: 'text-to-image' as GenerationMode,
  concurrentPrompts: 1,
  delayMin: 5,
  delayMax: 5,
  outputPerPrompt: 1,
  saveFolder: 'GrokAuto',
  autoRename: true,
  language: 'ko' as 'ko' | 'en',
  videoSettings: {
    aspectRatio: '16:9' as VideoSettings['aspectRatio'],
    duration: 6 as 6 | 10,
    resolution: '480p' as '480p' | '720p',
  },
  maxRetries: 5,
  videoDownloadQuality: '480p-upscale' as VideoDownloadQuality,
  imageDownloadQuality: '1k' as ImageDownloadQuality,
  defaultImageMode: 'new' as PromptImageMode,
  imageFrameMode: 'start-only' as ImageFrameMode,
  resizeTargetRatio: '16:9' as ResizeRatio,
};

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
  maxRetries: number;
  setMaxRetries: (n: number) => void;
  videoDownloadQuality: VideoDownloadQuality;
  setVideoDownloadQuality: (q: VideoDownloadQuality) => void;
  imageDownloadQuality: ImageDownloadQuality;
  setImageDownloadQuality: (q: ImageDownloadQuality) => void;
  defaultImageMode: PromptImageMode;
  setDefaultImageMode: (m: PromptImageMode) => void;
  imageFrameMode: ImageFrameMode;
  setImageFrameMode: (m: ImageFrameMode) => void;
  resizeTargetRatio: ResizeRatio;
  setResizeTargetRatio: (r: ResizeRatio) => void;

  // Language
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;

  // Running state
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;

  // Reset & Persistence
  resetToDefaults: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const STORAGE_KEY = 'grokauto_settings';

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'control',
  setActiveTab: (tab) => set({ activeTab: tab }),

  mode: DEFAULTS.mode,
  setMode: (mode) => {
    const isVideo = mode === 'text-to-video' || mode === 'frame-to-video' || mode === 'remix-video';
    const isResize = mode === 'resize';
    const defaultDelay = isVideo ? 15 : isResize ? 10 : 5;
    const needsImage = mode === 'image-to-image' || mode === 'frame-to-video' || mode === 'remix-video' || isResize;
    set({
      mode,
      delayMin: defaultDelay,
      delayMax: defaultDelay,
      ...(needsImage ? {} : { uploadedImages: [], promptImageModes: [] }),
    });
    get().saveToStorage();
  },

  concurrentPrompts: DEFAULTS.concurrentPrompts,
  setConcurrentPrompts: (n) => {
    set({ concurrentPrompts: n });
    get().saveToStorage();
  },

  delayMin: DEFAULTS.delayMin,
  delayMax: DEFAULTS.delayMax,
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
      const defaultMode = get().defaultImageMode;
      while (modes.length < promptCount) modes.push(defaultMode);
      return { promptImageModes: modes.slice(0, promptCount) };
    }),

  outputPerPrompt: DEFAULTS.outputPerPrompt,
  setOutputPerPrompt: (n) => {
    set({ outputPerPrompt: n });
    get().saveToStorage();
  },

  saveFolder: DEFAULTS.saveFolder,
  setSaveFolder: (folder) => {
    set({ saveFolder: folder });
    get().saveToStorage();
  },

  autoRename: DEFAULTS.autoRename,
  setAutoRename: (v) => {
    set({ autoRename: v });
    get().saveToStorage();
  },

  videoSettings: { ...DEFAULTS.videoSettings },
  setVideoSettings: (s) =>
    set((state) => {
      const vs = { ...state.videoSettings, ...s };
      setTimeout(() => get().saveToStorage(), 0);
      return { videoSettings: vs };
    }),

  maxRetries: DEFAULTS.maxRetries,
  setMaxRetries: (n) => {
    set({ maxRetries: Math.max(1, Math.min(20, n)) });
    get().saveToStorage();
  },

  videoDownloadQuality: DEFAULTS.videoDownloadQuality,
  setVideoDownloadQuality: (q) => {
    set({ videoDownloadQuality: q });
    get().saveToStorage();
  },

  imageDownloadQuality: DEFAULTS.imageDownloadQuality,
  setImageDownloadQuality: (q) => {
    set({ imageDownloadQuality: q });
    get().saveToStorage();
  },

  defaultImageMode: DEFAULTS.defaultImageMode,
  setDefaultImageMode: (m) => {
    set({ defaultImageMode: m });
    get().saveToStorage();
  },

  imageFrameMode: DEFAULTS.imageFrameMode,
  setImageFrameMode: (m) => {
    set({ imageFrameMode: m });
    get().saveToStorage();
  },

  resizeTargetRatio: DEFAULTS.resizeTargetRatio,
  setResizeTargetRatio: (r) => {
    set({ resizeTargetRatio: r });
    get().saveToStorage();
  },

  language: DEFAULTS.language,
  setLanguage: (lang) => {
    set({ language: lang });
    get().saveToStorage();
  },

  isRunning: false,
  setIsRunning: (v) => set({ isRunning: v }),

  resetToDefaults: () => {
    set({
      mode: DEFAULTS.mode,
      concurrentPrompts: DEFAULTS.concurrentPrompts,
      delayMin: DEFAULTS.delayMin,
      delayMax: DEFAULTS.delayMax,
      outputPerPrompt: DEFAULTS.outputPerPrompt,
      saveFolder: DEFAULTS.saveFolder,
      autoRename: DEFAULTS.autoRename,
      videoSettings: { ...DEFAULTS.videoSettings },
      maxRetries: DEFAULTS.maxRetries,
      videoDownloadQuality: DEFAULTS.videoDownloadQuality,
      imageDownloadQuality: DEFAULTS.imageDownloadQuality,
      defaultImageMode: DEFAULTS.defaultImageMode,
      imageFrameMode: DEFAULTS.imageFrameMode,
      resizeTargetRatio: DEFAULTS.resizeTargetRatio,
    });
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const data = result[STORAGE_KEY];
      if (data) {
        set({
          mode: data.mode ?? DEFAULTS.mode,
          concurrentPrompts: data.concurrentPrompts ?? DEFAULTS.concurrentPrompts,
          delayMin: data.delayMin ?? DEFAULTS.delayMin,
          delayMax: data.delayMax ?? DEFAULTS.delayMax,
          outputPerPrompt: data.outputPerPrompt ?? DEFAULTS.outputPerPrompt,
          saveFolder: data.saveFolder ?? DEFAULTS.saveFolder,
          autoRename: data.autoRename ?? DEFAULTS.autoRename,
          language: data.language ?? DEFAULTS.language,
          videoSettings: data.videoSettings ?? { ...DEFAULTS.videoSettings },
          maxRetries: data.maxRetries ?? DEFAULTS.maxRetries,
          videoDownloadQuality: data.videoDownloadQuality ?? DEFAULTS.videoDownloadQuality,
          imageDownloadQuality: data.imageDownloadQuality ?? DEFAULTS.imageDownloadQuality,
          defaultImageMode: data.defaultImageMode ?? DEFAULTS.defaultImageMode,
          imageFrameMode: data.imageFrameMode ?? DEFAULTS.imageFrameMode,
          resizeTargetRatio: data.resizeTargetRatio ?? DEFAULTS.resizeTargetRatio,
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
          maxRetries: s.maxRetries,
          videoDownloadQuality: s.videoDownloadQuality,
          imageDownloadQuality: s.imageDownloadQuality,
          defaultImageMode: s.defaultImageMode,
          imageFrameMode: s.imageFrameMode,
          resizeTargetRatio: s.resizeTargetRatio,
        },
      });
    } catch {
      // Storage not available
    }
  },
}));
