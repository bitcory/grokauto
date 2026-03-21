import { SELECTORS, querySelector } from './selectors';

/**
 * Type text into grok.com's prompt input field.
 * Uses execCommand('insertText') to properly trigger React state updates.
 */
export async function typePrompt(text: string): Promise<boolean> {
  const input = querySelector(SELECTORS.promptInput) as HTMLElement | null;
  if (!input) {
    console.error('[GrokAuto] Prompt input not found');
    return false;
  }

  // Focus the element
  input.focus();
  await new Promise((r) => setTimeout(r, 100));

  // Clear existing content
  if (input instanceof HTMLTextAreaElement) {
    input.select();
  } else {
    // Select all content in contenteditable
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  // Delete selected content
  document.execCommand('delete', false);
  await new Promise((r) => setTimeout(r, 100));

  // Insert text using execCommand - this triggers React's onChange properly
  document.execCommand('insertText', false, text);
  console.log(`[GrokAuto] Typed prompt: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

  // Wait for React state to update
  await new Promise((r) => setTimeout(r, 300));
  return true;
}

/**
 * Submit the prompt by pressing Enter key.
 * More reliable than clicking the send button for React apps.
 */
export async function submitWithEnter(): Promise<boolean> {
  const input = querySelector(SELECTORS.promptInput) as HTMLElement | null;
  if (!input) {
    console.error('[GrokAuto] Prompt input not found for Enter submit');
    return false;
  }

  input.focus();
  await new Promise((r) => setTimeout(r, 200));

  const enterProps = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  };

  // Send full Enter key sequence: keydown → keypress → keyup
  input.dispatchEvent(new KeyboardEvent('keydown', enterProps));
  input.dispatchEvent(new KeyboardEvent('keypress', enterProps));
  await new Promise((r) => setTimeout(r, 50));
  input.dispatchEvent(new KeyboardEvent('keyup', enterProps));

  console.log('[GrokAuto] Submitted with Enter key (full sequence)');
  return true;
}

/**
 * Click the send/generate button (fallback if Enter doesn't work).
 */
export async function clickSend(): Promise<boolean> {
  // 1) Find the bottom-right container inside the form, then its button
  const container = querySelector(SELECTORS.sendButtonContainer);
  if (container) {
    const btn = container.querySelector('button');
    if (btn) {
      btn.click();
      console.log('[GrokAuto] Clicked send button (container match)');
      return true;
    }
  }

  // 2) Try aria-label / data-testid selectors
  const btn = querySelector(SELECTORS.sendButton);
  if (btn) {
    (btn as HTMLElement).click();
    console.log('[GrokAuto] Clicked send button (aria/testid match)');
    return true;
  }

  // 3) Fallback: find the last button with an SVG inside the form
  const form = document.querySelector('form');
  if (form) {
    const allFormButtons = form.querySelectorAll('button');
    for (let i = allFormButtons.length - 1; i >= 0; i--) {
      const b = allFormButtons[i];
      if (b.querySelector('svg') && !b.disabled) {
        b.click();
        console.log('[GrokAuto] Clicked send button (last svg button fallback)');
        return true;
      }
    }
  }

  console.error('[GrokAuto] Send button not found');
  return false;
}

/**
 * Clear the prompt input
 */
export function clearPrompt(): void {
  const input = querySelector(SELECTORS.promptInput) as HTMLElement | null;
  if (!input) return;

  input.focus();

  if (input instanceof HTMLTextAreaElement) {
    input.select();
  } else {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  document.execCommand('delete', false);
}
