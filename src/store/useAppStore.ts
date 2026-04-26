import { create } from 'zustand';
import type {
  GenerationMode,
  TabType,
  VideoSettings,
  VideoDownloadQuality,
  ImageDownloadQuality,
  ImageFrameMode,
  ImageRefMode,
  ImageGenerationSpeed,
  ImageDownloadCount,
  ResizeRatio,
  TalkingVideoState,
  TalkingVideoScene,
  CinematicIntroState,
  CinematicScene,
} from '../types';

const DEFAULTS = {
  mode: 'frame-to-video' as GenerationMode,
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
  imageFrameMode: 'start-only' as ImageFrameMode,
  resizeTargetRatio: '16:9' as ResizeRatio,
  imageGenerationSpeed: 'quality' as ImageGenerationSpeed,
  imageDownloadCount: 'first' as ImageDownloadCount,
};

interface AppState {
  // UI
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Mode
  mode: GenerationMode;
  previousMode: GenerationMode | null;
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
  reorderUploadedImages: (fromIndex: number, toIndex: number) => void;

  // Per-prompt image ref modes (all vs single vs select)
  promptImageRefModes: ImageRefMode[];
  setPromptImageRefMode: (index: number, mode: ImageRefMode) => void;
  syncPromptImageRefModes: (count: number, imageCount?: number) => void;

  // Per-prompt image selections (for 'select' ref mode)
  promptImageSelections: number[][];
  togglePromptImageSelection: (promptIndex: number, imageIndex: number) => void;
  syncPromptImageSelections: (promptCount: number) => void;

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
  imageFrameMode: ImageFrameMode;
  setImageFrameMode: (m: ImageFrameMode) => void;
  resizeTargetRatio: ResizeRatio;
  setResizeTargetRatio: (r: ResizeRatio) => void;
  imageGenerationSpeed: ImageGenerationSpeed;
  setImageGenerationSpeed: (s: ImageGenerationSpeed) => void;
  imageDownloadCount: ImageDownloadCount;
  setImageDownloadCount: (c: ImageDownloadCount) => void;

  // Language
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;

  // Talking Video
  talkingVideo: TalkingVideoState;
  setTalkingVideo: (patch: Partial<TalkingVideoState>) => void;
  setTalkingVideoScenes: (scenes: TalkingVideoScene[]) => void;

  // Cinematic Intro
  cinematicIntro: CinematicIntroState;
  setCinematicIntroJson: (text: string) => void;
  setCinematicGenTarget: (target: 'image' | 'video') => void;

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
  previousMode: null,
  setMode: (mode) => {
    const currentMode = get().mode;
    const isVideo = mode === 'text-to-video' || mode === 'frame-to-video' || mode === 'remix-video' || mode === 'talking-video';
    const isResize = mode === 'resize';
    const isCinematic = mode === 'cinematic-intro';
    const defaultDelay = isVideo ? 15 : isResize ? 10 : isCinematic ? 8 : 5;
    const needsImage = mode === 'image-to-image' || mode === 'frame-to-video' || mode === 'remix-video' || isResize || mode === 'talking-video' || mode === 'cinematic-intro';
    set({
      mode,
      previousMode: currentMode !== mode ? currentMode : get().previousMode,
      delayMin: defaultDelay,
      delayMax: defaultDelay,
      ...(needsImage ? {} : { uploadedImages: [], promptImageRefModes: [], promptImageSelections: [] }),
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
  reorderUploadedImages: (fromIndex, toIndex) =>
    set((s) => {
      const images = [...s.uploadedImages];
      const [moved] = images.splice(fromIndex, 1);
      images.splice(toIndex, 0, moved);
      return { uploadedImages: images };
    }),

  promptImageRefModes: [],
  setPromptImageRefMode: (index, mode) =>
    set((s) => {
      const modes = [...s.promptImageRefModes];
      modes[index] = mode;
      return { promptImageRefModes: modes };
    }),
  syncPromptImageRefModes: (count, imageCount = 0) =>
    set((s) => {
      const defaultMode: ImageRefMode = imageCount <= 1 ? 'all' : 'single';
      const modes = [...s.promptImageRefModes];
      while (modes.length < count) modes.push(defaultMode);
      return { promptImageRefModes: modes.slice(0, count) };
    }),

  promptImageSelections: [],
  togglePromptImageSelection: (promptIndex, imageIndex) =>
    set((s) => {
      const selections = [...s.promptImageSelections];
      while (selections.length <= promptIndex) selections.push([]);
      const current = [...selections[promptIndex]];
      const idx = current.indexOf(imageIndex);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(imageIndex);
      }
      selections[promptIndex] = current;
      return { promptImageSelections: selections };
    }),
  syncPromptImageSelections: (promptCount) =>
    set((s) => {
      const selections = [...s.promptImageSelections];
      while (selections.length < promptCount) selections.push([]);
      return { promptImageSelections: selections.slice(0, promptCount) };
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

  imageGenerationSpeed: DEFAULTS.imageGenerationSpeed,
  setImageGenerationSpeed: (s) => {
    set({ imageGenerationSpeed: s });
    get().saveToStorage();
  },

  imageDownloadCount: DEFAULTS.imageDownloadCount,
  setImageDownloadCount: (c) => {
    set({ imageDownloadCount: c });
    get().saveToStorage();
  },

  language: DEFAULTS.language,
  setLanguage: (lang) => {
    set({ language: lang });
    get().saveToStorage();
  },

  talkingVideo: {
    videoType: 'interview',
    characterName: '',
    clothing: '',
    setting: '',
    cameraAngle: 'knee',
    expression: 'bright, innocent smile',
    language: 'Korean',
    interviewerRole: '20s woman Interviewer',
    scenes: [{ id: '1', interviewerLine: '', characterLine: '' }],
  },
  setTalkingVideo: (patch) =>
    set((s) => ({ talkingVideo: { ...s.talkingVideo, ...patch } })),
  setTalkingVideoScenes: (scenes) =>
    set((s) => ({ talkingVideo: { ...s.talkingVideo, scenes } })),

  cinematicIntro: { jsonText: '', parsedScenes: [], parseError: null, generationTarget: 'image' },
  setCinematicIntroJson: (text) => {
    const prev = get().cinematicIntro;
    if (!text.trim()) {
      set({ cinematicIntro: { ...prev, jsonText: text, parsedScenes: [], parseError: null } });
      return;
    }
    try {
      const json = JSON.parse(text);
      const scenes: CinematicScene[] = (json.opening_sequence?.scenes ?? json.scenes ?? []).map((s: any) => ({
        sceneNumber: s.scene_number ?? 0,
        title: s.title ?? '',
        type: s.type ?? '',
        imagePrompt: s.prompts?.image?.prompt ?? '',
        videoPrompt: s.prompts?.video?.prompt ?? undefined,
        videoDuration: s.prompts?.video?.duration ?? undefined,
      }));
      // JSON meta.aspect_ratio → videoSettings.aspectRatio 자동 반영
      const meta = json.opening_sequence?.meta ?? json.meta;
      const ratio = meta?.aspect_ratio;
      const validRatios = ['2:3', '3:2', '1:1', '9:16', '16:9'];
      if (ratio && validRatios.includes(ratio)) {
        const vs = { ...get().videoSettings, aspectRatio: ratio as VideoSettings['aspectRatio'] };
        set({ cinematicIntro: { ...prev, jsonText: text, parsedScenes: scenes, parseError: null }, videoSettings: vs });
        setTimeout(() => get().saveToStorage(), 0);
      } else {
        set({ cinematicIntro: { ...prev, jsonText: text, parsedScenes: scenes, parseError: null } });
      }
    } catch (e: any) {
      set({ cinematicIntro: { ...prev, jsonText: text, parsedScenes: [], parseError: e.message ?? 'Invalid JSON' } });
    }
  },
  setCinematicGenTarget: (target) => {
    const prev = get().cinematicIntro;
    set({ cinematicIntro: { ...prev, generationTarget: target } });

    // 탭 전환 시 프롬프트 + 딜레이 자동 세팅
    const scenes = prev.parsedScenes;
    if (target === 'image') {
      const prompts = scenes.filter((s) => s.imagePrompt).map((s) => s.imagePrompt);
      set({ promptText: prompts.join('\n\n'), delayMin: 8, delayMax: 8 });
    } else {
      const prompts = scenes.filter((s) => s.videoPrompt).map((s) => s.videoPrompt!);
      set({ promptText: prompts.join('\n\n'), delayMin: 20, delayMax: 20 });
    }
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
      imageFrameMode: DEFAULTS.imageFrameMode,
      resizeTargetRatio: DEFAULTS.resizeTargetRatio,
      imageGenerationSpeed: DEFAULTS.imageGenerationSpeed,
      imageDownloadCount: DEFAULTS.imageDownloadCount,
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
          imageFrameMode: data.imageFrameMode ?? DEFAULTS.imageFrameMode,
          resizeTargetRatio: data.resizeTargetRatio ?? DEFAULTS.resizeTargetRatio,
          imageGenerationSpeed: data.imageGenerationSpeed ?? DEFAULTS.imageGenerationSpeed,
          imageDownloadCount: data.imageDownloadCount ?? DEFAULTS.imageDownloadCount,
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
          imageFrameMode: s.imageFrameMode,
          resizeTargetRatio: s.resizeTargetRatio,
          imageGenerationSpeed: s.imageGenerationSpeed,
          imageDownloadCount: s.imageDownloadCount,
        },
      });
    } catch {
      // Storage not available
    }
  },
}));
