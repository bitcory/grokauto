export type GenerationMode =
  | 'text-to-video'
  | 'frame-to-video'
  | 'remix-video'
  | 'text-to-image'
  | 'image-to-image'
  | 'resize'
  | 'talking-video'
  | 'cinematic-intro';

export interface CinematicScene {
  sceneNumber: number;
  title: string;
  type: string;
  imagePrompt: string;
  videoPrompt?: string;
  videoDuration?: number;
}

export interface CinematicIntroState {
  jsonText: string;
  parsedScenes: CinematicScene[];
  parseError: string | null;
  generationTarget: 'image' | 'video';
}

export type ResizeRatio = '2:3' | '3:2' | '1:1' | '9:16' | '16:9';

export type PromptStatus = 'pending' | 'running' | 'completed' | 'failed';
export type VideoDownloadQuality = 'none' | '480p' | '480p-upscale' | '720p';
export type ImageDownloadQuality = 'none' | '1k';
export type ImageFrameMode = 'start-only' | 'start-end';
export type ImageRefMode = 'all' | 'single' | 'select';
export type ImageGenerationSpeed = 'speed' | 'quality';
export type ImageDownloadCount = 'first' | 'all';

export interface PromptItem {
  id: string;
  text: string;
  imageDataUrls?: string[];
  status: PromptStatus;
  outputCount: number;
  error?: string;
  downloadProgress?: number; // 0-100
  progress?: number; // 생성 진행률 0-100
  phase?: 'generated' | 'upscaling' | 'downloading'; // 세부 단계
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

export type TabType = 'control' | 'settings' | 'logs';

export type TalkingVideoType = 'interview' | 'monologue';

export interface TalkingVideoScene {
  id: string;
  interviewerLine: string;
  characterLine: string;
}

export interface TalkingVideoState {
  videoType: TalkingVideoType;
  characterName: string;
  clothing: string;
  setting: string;
  cameraAngle: string;
  expression: string;
  language: string;
  interviewerRole: string;
  scenes: TalkingVideoScene[];
}
