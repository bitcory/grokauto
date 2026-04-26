import { runAutomation, stopAutomation, isAutomationRunning } from './automator';
import type { Message } from '../shared/messages';
import { installLogRelay } from '../shared/logger';

// GrokAuto 태그 로그를 백그라운드/팝업으로 중계 (UI 로그 뷰어용).
installLogRelay('content', (entry) => {
  chrome.runtime.sendMessage({ type: 'LOG_ENTRY', payload: entry }).catch(() => {});
});

console.log('[GrokAuto] Content script loaded on', window.location.href);

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    switch (message.type) {
      case 'START_AUTOMATION':
        runAutomation(message.payload);
        sendResponse({ ok: true });
        break;

      case 'STOP_AUTOMATION':
        stopAutomation();
        sendResponse({ ok: true });
        break;

      case 'GET_AUTOMATION_STATUS':
        sendResponse({ ok: true, isRunning: isAutomationRunning() });
        break;

      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }

    // Return true to indicate async response
    return true;
  }
);
