import type { Message } from '../shared/messages';
import { installLogRelay, type LogEntry } from '../shared/logger';

// 로그 링버퍼 — 콘텐츠/백그라운드 양쪽의 GrokAuto 태그 로그를 팝업에서 조회.
const LOG_BUFFER_MAX = 500;
const logBuffer: LogEntry[] = [];
function appendLog(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) {
    logBuffer.splice(0, logBuffer.length - LOG_BUFFER_MAX);
  }
}

// 백그라운드 자신의 console.log도 캡처 → 버퍼에 저장 + 팝업에 브로드캐스트.
installLogRelay('background', (entry) => {
  appendLog(entry);
  chrome.runtime.sendMessage({ type: 'LOG_ENTRY', payload: entry }).catch(() => {});
});

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

// Video path (Grok UI button click) — listener still needed because Grok itself
// initiates the download and we can't pass a filename to download() ahead of time.
// Text-to-image path (handleDownload) computes the filename upfront and passes it
// directly to chrome.downloads.download, so it does NOT arm this state.
let pendingDownloadFolder: string | null = null;
let pendingDownloadExt: string | null = null;
let pendingDownloadPromptIndex: number | null = null;
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

function nextNumberedName(
  ext: string,
  opts: { indexSuffix?: number; promptIndex?: number } = {}
): string {
  // If promptIndex is given, use it as the leading number so failed prompts
  // leave gaps in the filename sequence (matching the UI list position).
  // Otherwise fall back to the running downloadCounter.
  let leading: number;
  if (opts.promptIndex != null) {
    leading = opts.promptIndex;
    // Still advance the counter so standalone (non-prompt-scoped) downloads
    // later in the session don't collide with these.
    downloadCounter = Math.max(downloadCounter, opts.promptIndex);
  } else {
    downloadCounter++;
    leading = downloadCounter;
  }
  chrome.storage.session.set({ downloadCounter }).catch(() => {});
  const suffix = opts.indexSuffix != null ? `_${opts.indexSuffix}` : '';
  return `${leading}_${generateSessionPrefix()}${suffix}.${ext}`;
}

function isFromGrok(item: chrome.downloads.DownloadItem): boolean {
  // 다른 확장이 시작한 다운로드는 우리 것이 아님
  if (item.byExtensionId) return false;

  const candidates = [item.referrer, item.url, item.finalUrl].filter(Boolean);
  return candidates.some((u) => {
    // blob:https://grok.com/... 형태는 'blob:' 접두사 제거
    const target = u!.startsWith('blob:') ? u!.slice(5) : u!;
    try {
      const h = new URL(target).hostname;
      return h === 'grok.com' || h.endsWith('.grok.com') ||
             h === 'x.com'    || h.endsWith('.x.com');
    } catch {
      return false;
    }
  });
}

// Video path (Grok UI button click): Grok's own DOM click triggers the download,
// so we can't pass a filename via chrome.downloads.download. We must intercept
// via onDeterminingFilename. But a permanently-registered listener interferes
// with other extensions' downloads (Chrome's multi-listener behavior on
// data:/blob: URLs breaks, producing UUID filenames). Solution: register the
// listener ONLY during the brief armed window (SET_DOWNLOAD_FOLDER → Grok click
// → onDeterminingFilename fires) and remove it immediately after.
const videoFilenameListener = (
  item: chrome.downloads.DownloadItem,
  suggest: (arg?: chrome.downloads.DownloadFilenameSuggestion) => void
): boolean => {
  // Belt-and-suspenders gates — the listener is only registered when armed
  // anyway, but defense-in-depth guards against cross-contamination.
  // referrer 단독 체크는 rel="noreferrer" / blob URL 케이스에서 빈 값이라
  // Grok 자체 다운로드를 놓치므로 url/finalUrl/referrer 여러 신호를 함께 본다.
  const isGrokUI = pendingDownloadFolder !== null && isFromGrok(item);
  if (!isGrokUI) {
    // 우리 것이 아닌 다운로드엔 suggest() 를 호출하지 않는다.
    // suggest() 를 호출하면 Chrome 의 멀티-리스너 경합에 참여하게 되어
    // 다른 확장(예: TOOLB FLOW)의 파일명 주장을 방해한다 (v1.4.5~v1.4.13 회귀 원인).
    // 그냥 리스너를 떼고 빠지면 다른 리스너의 suggest 가 그대로 살아남는다.
    detachVideoFilenameListener();
    return false;
  }

  const folder = pendingDownloadFolder!;
  const rawExt = pendingDownloadExt || item.filename.split('.').pop() || 'png';
  // Windows에선 image/jpeg가 .jfif로 제안됨 — .jpg로 정규화
  const ext = normalizeExt(rawExt);
  const promptIndex = pendingDownloadPromptIndex ?? undefined;
  pendingDownloadFolder = null;
  pendingDownloadExt = null;
  pendingDownloadPromptIndex = null;
  if (pendingDownloadTimeout) {
    clearTimeout(pendingDownloadTimeout);
    pendingDownloadTimeout = null;
  }
  const numbered = nextNumberedName(ext, { promptIndex });
  const fullPath = folder ? `${folder}/${numbered}` : numbered;
  suggest({ filename: fullPath });
  detachVideoFilenameListener();
  console.log(`[GrokAuto] Download filename set: ${fullPath}`);
  return true;
};

function attachVideoFilenameListener(): void {
  if (!chrome.downloads.onDeterminingFilename.hasListener(videoFilenameListener)) {
    chrome.downloads.onDeterminingFilename.addListener(videoFilenameListener);
  }
}

function detachVideoFilenameListener(): void {
  if (chrome.downloads.onDeterminingFilename.hasListener(videoFilenameListener)) {
    chrome.downloads.onDeterminingFilename.removeListener(videoFilenameListener);
  }
}

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
        // Content script will click Grok's own download button next.
        // Register the filename listener ONLY for this brief window so we
        // don't interfere with other extensions' downloads the rest of the time.
        pendingDownloadFolder = (message as any).payload?.folder || null;
        pendingDownloadPromptIndex = (message as any).payload?.promptIndex ?? null;
        attachVideoFilenameListener();
        if (pendingDownloadTimeout) clearTimeout(pendingDownloadTimeout);
        pendingDownloadTimeout = setTimeout(() => {
          pendingDownloadFolder = null;
          pendingDownloadPromptIndex = null;
          pendingDownloadTimeout = null;
          detachVideoFilenameListener();
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

      case 'LOG_ENTRY':
        // 콘텐츠 스크립트가 보낸 로그 — 버퍼에 추가하고 팝업으로 브로드캐스트.
        // (팝업도 같은 메시지를 직접 수신하지만 버퍼 보관을 위해 백그라운드에서 처리)
        appendLog(message.payload);
        sendResponse({ ok: true });
        break;

      case 'GET_LOG_HISTORY':
        sendResponse({ ok: true, entries: logBuffer.slice() });
        break;

      case 'CLEAR_LOG_HISTORY':
        logBuffer.length = 0;
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
 * jpeg/jfif → jpg 로 통일. (윈도우 레지스트리가 image/jpeg 를 .jfif 로 매핑해서
 * Chrome 이 다운로드 파일명을 .jfif 로 제안하는 케이스를 흡수.)
 */
function normalizeExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'jpeg' || e === 'jfif') return 'jpg';
  return e;
}

/**
 * Detect file extension from a URL. Falls back to 'png' for image downloads.
 */
function detectExtFromUrl(url: string, fallback = 'png'): string {
  // data: URL → infer from MIME
  if (url.startsWith('data:')) {
    const m = url.match(/^data:image\/([a-z0-9+]+)/i);
    if (m) return normalizeExt(m[1]);
    return fallback;
  }
  // strip query/hash, then take last segment
  const clean = url.split('?')[0].split('#')[0];
  const last = clean.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot < 0) return fallback;
  const ext = last.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]{1,5}$/.test(ext)) return fallback;
  return normalizeExt(ext);
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
 * Handle text-to-image download via chrome.downloads API.
 * - For data: URLs, fetch into a Blob and use a blob URL (more reliable in MV3
 *   service workers than passing huge data URLs to chrome.downloads.download).
 * - Filename is computed upfront and passed directly to download() — no
 *   onDeterminingFilename coordination needed. This keeps GrokAuto from
 *   competing with other extensions' listeners (e.g. TOOLB FLOW on labs.google).
 */
async function handleDownload(payload: {
  url: string;
  folder: string;
  indexSuffix?: number;
  promptIndex?: number;
}): Promise<void> {
  const { url, indexSuffix, promptIndex } = payload;
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

  // 2. Compute filename upfront (blob URL initiated from the service worker has
  //    no Grok-page referrer, so the listener above won't claim this download).
  const numbered = nextNumberedName(ext, { indexSuffix, promptIndex });
  const filename = folder ? `${folder}/${numbered}` : numbered;

  chrome.downloads.download(
    {
      url: downloadUrl,
      filename,
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[GrokAuto] Download failed:',
          chrome.runtime.lastError.message
        );
      } else {
        console.log(
          `[GrokAuto] Download started (ID: ${downloadId}) → ${filename}`
        );
      }
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
