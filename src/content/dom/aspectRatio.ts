import type { VideoSettings } from '../../types';

/**
 * Aspect ratio label mappings for matching dropdown menu items
 */
const ASPECT_RATIO_LABELS: Record<VideoSettings['aspectRatio'], string[]> = {
  '2:3': ['2:3', '2∶3'],
  '3:2': ['3:2', '3∶2'],
  '1:1': ['1:1', '1∶1'],
  '9:16': ['9:16', '9∶16'],
  '16:9': ['16:9', '16∶9'],
};

/**
 * Get center coordinates of an element for event simulation.
 */
function getCenter(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Simulate a full pointer click sequence for Radix UI trigger buttons.
 */
function simulateRealClick(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center' });
  const { x, y } = getCenter(el);
  const opts: PointerEventInit & MouseEventInit = {
    bubbles: true, cancelable: true, view: window,
    clientX: x, clientY: y, button: 0, buttons: 1,
  };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

/**
 * Simulate Radix menu item selection.
 * Radix menu items need: pointermove (hover) → pointerdown → pointerup → click
 * The hover via pointermove triggers the focus/highlight state first.
 */
function clickMenuItem(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center' });
  const { x, y } = getCenter(el);
  const opts: PointerEventInit & MouseEventInit = {
    bubbles: true, cancelable: true, view: window,
    clientX: x, clientY: y, button: 0, buttons: 0,
  };

  // Step 1: Hover — triggers Radix's onPointerMove handler to highlight the item
  el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseenter', opts));
  el.dispatchEvent(new MouseEvent('mouseover', opts));

  // Step 2: Focus the item
  el.focus();

  // Step 3: Pointer down/up sequence — triggers Radix's selection
  const clickOpts = { ...opts, buttons: 1 };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...clickOpts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', clickOpts));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', { ...opts, button: 0 }));
}

/**
 * Find the aspect ratio trigger button.
 */
function findTrigger(): HTMLElement | null {
  // Strategy 1: aria-label
  const byLabel = document.querySelector('button[aria-label="종횡비"], button[aria-label="Aspect ratio"]') as HTMLElement | null;
  if (byLabel) {
    console.log('[GrokAuto] Found aspect ratio trigger by aria-label');
    return byLabel;
  }

  // Strategy 2: button with aria-haspopup="menu" containing ratio text
  const haspopupBtns = document.querySelectorAll('button[aria-haspopup="menu"]');
  for (const btn of haspopupBtns) {
    const text = (btn as HTMLElement).innerText?.trim() ?? '';
    if (/^\d+\s*[∶:]\s*\d+$/.test(text)) {
      console.log(`[GrokAuto] Found aspect ratio trigger by haspopup + text: "${text}"`);
      return btn as HTMLElement;
    }
  }

  return null;
}

/**
 * Wait for a Radix menu to appear in the DOM.
 */
function waitForMenu(timeoutMs: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.querySelector('[data-radix-menu-content]');
    if (existing) { resolve(true); return; }

    let settled = false;
    const observer = new MutationObserver(() => {
      if (settled) return;
      if (document.querySelector('[data-radix-menu-content]')) {
        settled = true;
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(false);
      }
    }, timeoutMs);
  });
}

/**
 * Set the aspect ratio by clicking the dropdown trigger and selecting the option.
 */
export async function setAspectRatio(
  aspectRatio: VideoSettings['aspectRatio']
): Promise<boolean> {
  const labels = ASPECT_RATIO_LABELS[aspectRatio];

  const trigger = findTrigger();
  if (!trigger) {
    console.warn('[GrokAuto] Aspect ratio trigger not found');
    return false;
  }

  // Check if already set
  const currentText = trigger.innerText?.trim() ?? '';
  if (labels.some((l) => currentText === l)) {
    console.log(`[GrokAuto] Aspect ratio already set to ${aspectRatio}`);
    return true;
  }

  // Try opening the dropdown
  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`[GrokAuto] Opening aspect ratio dropdown (attempt ${attempt + 1})`);

    simulateRealClick(trigger);
    const menuOpened = await waitForMenu(3000);

    if (!menuOpened) {
      const expanded = trigger.getAttribute('aria-expanded') === 'true' ||
                       trigger.getAttribute('data-state') === 'open';
      if (!expanded) {
        console.log('[GrokAuto] Menu did not open, retrying...');
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }

    await new Promise((r) => setTimeout(r, 500));

    // Search menu items
    const menuItems = document.querySelectorAll('[data-radix-menu-content] [role="menuitem"]');
    const allTexts: string[] = [];

    for (const item of menuItems) {
      const text = (item as HTMLElement).innerText?.trim() ?? '';
      allTexts.push(text);
      if (labels.some((label) => text === label || text.includes(label))) {
        console.log(`[GrokAuto] Found target menu item: "${text}", clicking...`);

        // Use specialized menu item click with hover simulation
        clickMenuItem(item as HTMLElement);
        await new Promise((r) => setTimeout(r, 500));

        // Verify the change took effect
        const newText = trigger.innerText?.trim() ?? '';
        console.log(`[GrokAuto] Aspect ratio after click: "${newText}"`);
        return true;
      }
    }

    console.log(`[GrokAuto] Menu items: [${allTexts.map(t => `"${t}"`).join(', ')}]`);

    // Close menu before retry
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
  }

  console.warn(`[GrokAuto] Aspect ratio option not found for ${aspectRatio}`);
  return false;
}
