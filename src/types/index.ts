export type GenerationMode =
  | 'text-to-video'
  | 'frame-to-video'
  | 'remix-video'
  | 'text-to-image'
  | 'image-to-image';

export type PromptStatus = 'pending' | 'running' | 'completed' | 'failed';
export type PromptImageMode = 'new' | 'reuse';

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
  duration: 5 | 10;
}

export type TabType = 'control' | 'settings';
