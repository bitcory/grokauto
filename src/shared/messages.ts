import type { GenerationMode, PromptItem, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, ImageFrameMode, ImageGenerationSpeed, ImageDownloadCount, ResizeRatio } from '../types';
import type { LogEntry } from './logger';

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
    imageDownloadCount: ImageDownloadCount;
    resizeTargetRatio?: ResizeRatio;
  };
}

export interface StopAutomationMessage {
  type: 'STOP_AUTOMATION';
}

// Content → Background
// Background generates the auto-numbered filename from the URL extension.
export interface DownloadResultMessage {
  type: 'DOWNLOAD_RESULT';
  payload: {
    url: string;
    folder: string;
    // Optional 1-based suffix index within a single prompt. When set, filename
    // becomes `{prefix}_{N}.{ext}` — used when one prompt produces multiple
    // images (t2i quality=4, i2i=2).
    indexSuffix?: number;
    // Optional 1-based position of the prompt in the batch. When set, it
    // replaces the running download counter so filename numbering matches the
    // prompt list position (failed prompts leave gaps). Without this, numbering
    // would be "1,2,3..." for every successful download regardless of which
    // prompt it came from.
    promptIndex?: number;
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
    // Prompt position (1-based) — lets the filename listener stamp the same
    // prompt index on the video filename when Grok's own download button fires.
    promptIndex?: number;
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

// Popup → Content: query whether automation is currently running
export interface GetAutomationStatusMessage {
  type: 'GET_AUTOMATION_STATUS';
}

// Content/Background → Popup: single log entry for the live log viewer
export interface LogEntryMessage {
  type: 'LOG_ENTRY';
  payload: LogEntry;
}

// Popup → Background: fetch buffered log history on open
export interface GetLogHistoryMessage {
  type: 'GET_LOG_HISTORY';
}

// Popup → Background: clear the log ring buffer
export interface ClearLogHistoryMessage {
  type: 'CLEAR_LOG_HISTORY';
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
  | AutomationDoneMessage
  | GetAutomationStatusMessage
  | LogEntryMessage
  | GetLogHistoryMessage
  | ClearLogHistoryMessage;
