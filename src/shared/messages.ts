import type { GenerationMode, PromptItem, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, ImageFrameMode, ImageGenerationSpeed, ResizeRatio } from '../types';

// Popup → Background → Content
export interface StartAutomationMessage {
  type: 'START_AUTOMATION';
  payload: {
    mode: GenerationMode;
    prompts: PromptItem[];
    concurrentPrompts: number;
    delayMin: number;
    delayMax: number;
    outputPerPrompt: number;
    saveFolder: string;
    autoRename: boolean;
    videoSettings: VideoSettings;
    maxRetries: number;
    videoDownloadQuality: VideoDownloadQuality;
    imageDownloadQuality: ImageDownloadQuality;
    imageFrameMode: ImageFrameMode;
    imageGenerationSpeed: ImageGenerationSpeed;
    resizeTargetRatio?: ResizeRatio;
  };
}

export interface StopAutomationMessage {
  type: 'STOP_AUTOMATION';
}

// Content → Background
export interface DownloadResultMessage {
  type: 'DOWNLOAD_RESULT';
  payload: {
    url: string;
    filename: string;
    folder: string;
  };
}

export interface PromptStatusUpdateMessage {
  type: 'PROMPT_STATUS_UPDATE';
  payload: {
    promptId: string;
    status: PromptItem['status'];
    error?: string;
  };
}

export interface AutomationCompleteMessage {
  type: 'AUTOMATION_COMPLETE';
}

// Content → Background: store config for re-send after page reload
export interface StorePendingAutomationMessage {
  type: 'STORE_PENDING_AUTOMATION';
  payload: StartAutomationMessage['payload'];
}

// Content → Background: set folder for next download
export interface SetDownloadFolderMessage {
  type: 'SET_DOWNLOAD_FOLDER';
  payload: {
    folder: string;
  };
}

// Background → Popup
export interface StatusUpdateMessage {
  type: 'STATUS_UPDATE';
  payload: {
    promptId: string;
    status: PromptItem['status'];
    error?: string;
  };
}

export interface AutomationDoneMessage {
  type: 'AUTOMATION_DONE';
}

export type Message =
  | StartAutomationMessage
  | StopAutomationMessage
  | DownloadResultMessage
  | PromptStatusUpdateMessage
  | AutomationCompleteMessage
  | StorePendingAutomationMessage
  | SetDownloadFolderMessage
  | StatusUpdateMessage
  | AutomationDoneMessage;
