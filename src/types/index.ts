export type GenerationMode =
  | 'text-to-video'
  | 'frame-to-video'
  | 'remix-video'
  | 'text-to-image'
  | 'image-to-image'
  | 'resize';

export type ResizeRatio = '2:3' | '3:2' | '1:1' | '9:16' | '16:9';

export type PromptStatus = 'pending' | 'running' | 'completed' | 'failed';
export type PromptImageMode = 'new' | 'reuse';
export type VideoDownloadQuality = 'none' | '480p' | '480p-upscale' | '720p';
export type ImageDownloadQuality = 'none' | '1k';
export type ImageFrameMode = 'start-only' | 'start-end';

export interface PromptItem {
  id: string;
  text: string;
  imageDataUrls?: string[];
  imageMode: PromptImageMode;
  status: PromptStatus;
  outputCount: number;
  error?: string;
  downloadProgress?: number; // 0-100
}

export interface AppSettings {
  mode: GenerationMode;
  concurrentPrompts: number;
  delayMin: number;
  delayMax: number;
  outputPerPrompt: number;
  saveFolder: string;
  autoRename: boolean;
  language: 'ko' | 'en';
}

export interface VideoSettings {
  aspectRatio: '2:3' | '3:2' | '1:1' | '9:16' | '16:9';
  duration: 6 | 10;
  resolution: '480p' | '720p';
}

export type TabType = 'control' | 'settings';
