import { runAutomation, stopAutomation } from './automator';
import type { Message } from '../shared/messages';

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

      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }

    // Return true to indicate async response
    return true;
  }
);
