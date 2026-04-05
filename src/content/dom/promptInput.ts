import { SELECTORS, querySelector } from './selectors';

/**
 * Re-query and focus the prompt input element.
 * After image upload the contenteditable may have been re-mounted by React,
 * so we need to find it again.
 */
async function acquireInput(): Promise<HTMLElement | null> {
  // Try up to 3 times with short delays (element may be re-mounting)
  for (let i = 0; i < 3; i++) {
    const el = querySelector(SELECTORS.promptInput) as HTMLElement | null;
    if (el) {
      el.focus();
      await new Promise((r) => setTimeout(r, 150));
      // Verify focus actually landed
      if (document.activeElement === el || el.contains(document.activeElement)) {
        return el;
      }
      // Force focus via click + focus
      el.click();
      el.focus();
      await new Promise((r) => setTimeout(r, 100));
      if (document.activeElement === el || el.contains(document.activeElement)) {
        return el;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return querySelector(SELECTORS.promptInput) as HTMLElement | null;
}

/**
 * Clear the contents of a prompt input element.
 */
async function clearInput(input: HTMLElement): Promise<void> {
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
  await new Promise((r) => setTimeout(r, 100));
}

/**
 * Check whether text was actually inserted into the element.
 */
function hasContent(el: HTMLElement, expected: string): boolean {
  const content = (el.textContent ?? '').trim();
  // Consider success if at least the first 10 chars match (or full match for short text)
  const check = expected.substring(0, 10);
  return content.length > 0 && content.includes(check);
}

/**
 * Fallback 1: Set textContent + dispatch InputEvent to sync React state.
 */
async function insertViaInputEvent(input: HTMLElement, text: string): Promise<boolean> {
  console.log('[GrokAuto] Trying InputEvent fallback');
  input.focus();
  await new Promise((r) => setTimeout(r, 100));

  // Set content directly
  input.textContent = text;

  // Dispatch InputEvent to notify React
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text,
    })
  );

  await new Promise((r) => setTimeout(r, 200));
  return hasContent(input, text);
}

/**
 * Fallback 2: Use clipboard paste via DataTransfer.
 */
async function insertViaPaste(input: HTMLElement, text: string): Promise<boolean> {
  console.log('[GrokAuto] Trying clipboard paste fallback');
  input.focus();
  await new Promise((r) => setTimeout(r, 100));

  const dt = new DataTransfer();
  dt.setData('text/plain', text);

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  });
  input.dispatchEvent(pasteEvent);

  await new Promise((r) => setTimeout(r, 300));
  return hasContent(input, text);
}

/**
 * Type text into grok.com's prompt input field.
 * Uses execCommand('insertText') with multiple fallback strategies
 * to handle cases where the contenteditable is re-mounted after image upload.
 */
export async function typePrompt(text: string): Promise<boolean> {
  // Acquire (or re-acquire) the input element with focus
  let input = await acquireInput();
  if (!input) {
    console.error('[GrokAuto] Prompt input not found');
    return false;
  }

  // Clear existing content
  await clearInput(input);

  // Strategy 1: execCommand('insertText') — the gold standard for React
  document.execCommand('insertText', false, text);
  await new Promise((r) => setTimeout(r, 300));

  if (hasContent(input, text)) {
    console.log(`[GrokAuto] Typed prompt (execCommand): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    return true;
  }

  // Re-acquire input in case it was re-mounted
  input = await acquireInput();
  if (!input) {
    console.error('[GrokAuto] Prompt input lost after execCommand');
    return false;
  }

  // Strategy 2: InputEvent-based insertion
  await clearInput(input);
  if (await insertViaInputEvent(input, text)) {
    console.log(`[GrokAuto] Typed prompt (InputEvent): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    return true;
  }

  // Re-acquire again
  input = await acquireInput();
  if (!input) {
    console.error('[GrokAuto] Prompt input lost after InputEvent');
    return false;
  }

  // Strategy 3: Clipboard paste
  await clearInput(input);
  if (await insertViaPaste(input, text)) {
    console.log(`[GrokAuto] Typed prompt (paste): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    return true;
  }

  console.error('[GrokAuto] All text input strategies failed');
  return false;
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
