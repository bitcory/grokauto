import type { Message } from '../shared/messages';

console.log('[GrokAuto] Background service worker started');

// 서비스 워커 재시작 시 storage에서 상태 복구
chrome.storage.session.get(['downloadCounter', 'sessionPrefix']).then((data) => {
  if (data.downloadCounter != null) downloadCounter = data.downloadCounter;
  if (data.sessionPrefix) sessionPrefix = data.sessionPrefix;
}).catch(() => {});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Pending automation config for re-sending after page reload
let pendingAutomation: Message | null = null;

// When a grok.com/imagine tab finishes loading, re-send pending automation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    pendingAutomation &&
    changeInfo.status === 'complete' &&
    tab.url?.startsWith('https://grok.com/imagine')
  ) {
    chrome.tabs.sendMessage(tabId, pendingAutomation).catch(() => {});
    pendingAutomation = null;
  }
});

// Pending download info for intercepting downloads via onDeterminingFilename.
// Both video (Grok UI button click) and text-to-image (direct chrome.downloads.download)
// use this same mechanism so the listener can always call suggest() with the right filename.
let pendingDownloadFolder: string | null = null;
let pendingDownloadExt: string | null = null; // pre-determined extension (for data/blob URLs)
let pendingDownloadTimeout: ReturnType<typeof setTimeout> | null = null;
let downloadCounter = 0;
let sessionPrefix = ''; // 세션별 타임스탬프 접두사 (YYYYMMDD_HHmm)

function generateSessionPrefix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${mo}${d}_${h}${mi}${s}`;
}

// Intercept ALL downloads triggered by GrokAuto and assign the correct filename.
// Both video (Grok button-click) and text-to-image (direct chrome.downloads.download)
// go through this listener. The listener MUST call suggest() — if it doesn't, Chrome
// falls back to its own default name (e.g. "다운로드.jpeg") ignoring what we passed
// in chrome.downloads.download({ filename }).
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (pendingDownloadFolder !== null) {
    const folder = pendingDownloadFolder;
    // For text-to-image: ext was pre-determined from the data URL MIME type.
    // For video: ext comes from the download item's filename (e.g. .mp4).
    const ext = pendingDownloadExt || item.filename.split('.').pop() || 'png';
    pendingDownloadFolder = null;
    pendingDownloadExt = null;
    if (pendingDownloadTimeout) {
      clearTimeout(pendingDownloadTimeout);
      pendingDownloadTimeout = null;
    }
    downloadCounter++;
    chrome.storage.session.set({ downloadCounter }).catch(() => {});
    const numberedName = `${downloadCounter}_${generateSessionPrefix()}.${ext}`;
    const fullPath = folder ? `${folder}/${numberedName}` : numberedName;
    suggest({ filename: fullPath });
    console.log(`[GrokAuto] Download filename set: ${fullPath}`);
    return;
  }
  // Not our download — pass through without interfering
  suggest();
});

// Message routing between popup and content scripts
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    switch (message.type) {
      case 'START_AUTOMATION':
        downloadCounter = 0;
        sessionPrefix = generateSessionPrefix();
        // storage에도 저장 (서비스 워커 재시작 대비)
        chrome.storage.session.set({ downloadCounter: 0, sessionPrefix }).catch(() => {});
        forwardToGrokTab(message).then(sendResponse);
        return true;

      case 'STOP_AUTOMATION':
        pendingAutomation = null;
        forwardToGrokTab(message).then(sendResponse);
        return true;

      case 'STORE_PENDING_AUTOMATION':
        pendingAutomation = {
          type: 'START_AUTOMATION',
          payload: (message as any).payload,
        } as Message;
        sendResponse({ ok: true });
        break;

      case 'SET_DOWNLOAD_FOLDER':
        // Content script will click download button next
        pendingDownloadFolder = (message as any).payload?.folder || null;
        // Auto-clear after 10s in case download doesn't happen
        if (pendingDownloadTimeout) clearTimeout(pendingDownloadTimeout);
        pendingDownloadTimeout = setTimeout(() => {
          pendingDownloadFolder = null;
          pendingDownloadTimeout = null;
        }, 10000);
        sendResponse({ ok: true });
        break;

      case 'DOWNLOAD_RESULT':
        handleDownload(message.payload);
        sendResponse({ ok: true });
        break;

      case 'PROMPT_STATUS_UPDATE':
        chrome.runtime.sendMessage({
          type: 'STATUS_UPDATE',
          payload: message.payload,
        }).catch(() => {});
        updateBadge(message.payload.status);
        sendResponse({ ok: true });
        break;

      case ('PROMPT_PROGRESS_UPDATE' as any):
        chrome.runtime.sendMessage({
          type: 'PROGRESS_UPDATE',
          payload: (message as any).payload,
        }).catch(() => {});
        sendResponse({ ok: true });
        break;

      case 'AUTOMATION_COMPLETE':
        chrome.runtime.sendMessage({ type: 'AUTOMATION_DONE' }).catch(() => {});
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ ok: true });
        break;
    }
  }
);

/**
 * Forward a message to the active grok.com tab's content script
 */
async function forwardToGrokTab(message: Message): Promise<{ ok: boolean; error?: string }> {
  try {
    const tabs = await chrome.tabs.query({
      url: ['*://grok.com/*'],
      active: true,
      currentWindow: true,
    });

    // If no active grok tab, try any grok tab
    let targetTab = tabs[0];
    if (!targetTab) {
      const allGrokTabs = await chrome.tabs.query({ url: ['*://grok.com/*'] });
      targetTab = allGrokTabs[0];
    }

    if (!targetTab?.id) {
      return { ok: false, error: 'No grok.com tab found. Please open grok.com first.' };
    }

    await chrome.tabs.sendMessage(targetTab.id, message);
    return { ok: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: errorMsg };
  }
}

/**
 * Detect file extension from a URL. Falls back to 'png' for image downloads.
 */
function detectExtFromUrl(url: string, fallback = 'png'): string {
  // data: URL → infer from MIME
  if (url.startsWith('data:')) {
    const m = url.match(/^data:image\/([a-z0-9+]+)/i);
    if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
    return fallback;
  }
  // strip query/hash, then take last segment
  const clean = url.split('?')[0].split('#')[0];
  const last = clean.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot < 0) return fallback;
  const ext = last.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]{1,5}$/.test(ext)) return fallback;
  return ext;
}

/**
 * Sanitize a folder path for chrome.downloads (forward slashes only, no leading/
 * trailing slashes, no parent refs).
 */
function sanitizeFolder(folder: string | undefined): string {
  if (!folder) return '';
  return folder
    .replace(/\\/g, '/')
    .replace(/\.\.+/g, '')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

/**
 * Handle file download via chrome.downloads API.
 * - For data: URLs, fetch into a Blob and use a blob URL (more reliable in MV3
 *   service workers than passing huge data URLs to chrome.downloads.download).
 * - Arms pendingDownloadFolder/Ext so the onDeterminingFilename listener
 *   assigns the correct numbered filename and folder path.
 */
async function handleDownload(payload: {
  url: string;
  folder: string;
}): Promise<void> {
  const { url } = payload;
  const folder = sanitizeFolder(payload.folder);
  const ext = detectExtFromUrl(url, 'png');

  console.log(
    `[GrokAuto] handleDownload: folder="${folder}", ext="${ext}", urlType="${url.slice(0, 20)}..."`
  );

  // 1. Convert data URL → Blob URL (more reliable in MV3 service workers)
  let downloadUrl = url;
  let createdBlobUrl: string | null = null;

  if (url.startsWith('data:')) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      createdBlobUrl = URL.createObjectURL(blob);
      downloadUrl = createdBlobUrl;
      console.log(
        `[GrokAuto] data URL → blob (${blob.size} bytes, type=${blob.type})`
      );
    } catch (err) {
      console.error('[GrokAuto] Failed to convert data URL to blob:', err);
    }
  }

  // 2. Arm the interceptor RIGHT BEFORE triggering the download
  pendingDownloadFolder = folder;
  pendingDownloadExt = ext;
  if (pendingDownloadTimeout) clearTimeout(pendingDownloadTimeout);
  pendingDownloadTimeout = setTimeout(() => {
    pendingDownloadFolder = null;
    pendingDownloadExt = null;
    pendingDownloadTimeout = null;
  }, 10000);

  // 3. Trigger download — DO NOT set filename here; the onDeterminingFilename
  //    listener will call suggest() with the correct folder/numbered filename.
  chrome.downloads.download(
    {
      url: downloadUrl,
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[GrokAuto] Download failed:',
          chrome.runtime.lastError.message
        );
      } else {
        console.log(`[GrokAuto] Download started (ID: ${downloadId})`);
      }
      // Revoke the blob URL after Chrome has had a chance to read it
      if (createdBlobUrl) {
        setTimeout(() => {
          URL.revokeObjectURL(createdBlobUrl!);
        }, 10000);
      }
    }
  );
}

/**
 * Update badge to show current status
 */
let runningCount = 0;

function updateBadge(status: string): void {
  if (status === 'running') {
    runningCount++;
  } else if (status === 'completed' || status === 'failed') {
    runningCount = Math.max(0, runningCount - 1);
  }

  if (runningCount > 0) {
    chrome.action.setBadgeText({ text: String(runningCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}
