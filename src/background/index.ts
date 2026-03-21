import type { Message } from '../shared/messages';

console.log('[GrokAuto] Background service worker started');

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

// Pending download folder for intercepting grok.com downloads
let pendingDownloadFolder: string | null = null;
let pendingDownloadTimeout: ReturnType<typeof setTimeout> | null = null;

// Intercept downloads from grok.com and redirect to specified folder
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (pendingDownloadFolder && item.url.includes('grok.com')) {
    const folder = pendingDownloadFolder;
    pendingDownloadFolder = null;
    if (pendingDownloadTimeout) {
      clearTimeout(pendingDownloadTimeout);
      pendingDownloadTimeout = null;
    }
    suggest({ filename: `${folder}/${item.filename}` });
    console.log(`[GrokAuto] Redirected download to: ${folder}/${item.filename}`);
  } else if (pendingDownloadFolder) {
    // Any download while folder is set (might be triggered by the button)
    const folder = pendingDownloadFolder;
    pendingDownloadFolder = null;
    if (pendingDownloadTimeout) {
      clearTimeout(pendingDownloadTimeout);
      pendingDownloadTimeout = null;
    }
    suggest({ filename: `${folder}/${item.filename}` });
    console.log(`[GrokAuto] Redirected download to: ${folder}/${item.filename}`);
  } else {
    suggest();
  }
});

// Message routing between popup and content scripts
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    switch (message.type) {
      case 'START_AUTOMATION':
        // Forward to content script on grok.com tab
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
 * Handle file download via chrome.downloads API
 */
function handleDownload(payload: {
  url: string;
  filename: string;
  folder: string;
}): void {
  const { url, filename, folder } = payload;
  const fullPath = folder ? `${folder}/${filename}` : filename;

  chrome.downloads.download(
    {
      url,
      filename: fullPath,
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[GrokAuto] Download failed:',
          chrome.runtime.lastError.message
        );
      } else {
        console.log(`[GrokAuto] Download started: ${fullPath} (ID: ${downloadId})`);
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
