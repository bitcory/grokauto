/**
 * Video-specific settings and post-generation actions for grok.com/imagine.
 */

/**
 * Simulate a real user click with full pointer event sequence.
 * Radix UI requires pointerdown/mousedown/pointerup/mouseup/click.
 */
function simulateRealClick(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center' });
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts: PointerEventInit & MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
  };

  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

/**
 * Click a chip button in the form that matches the given text exactly.
 */
async function clickFormChip(label: string): Promise<boolean> {
  const input = document.querySelector('div[contenteditable="true"]');
  const form = input?.closest('form') ?? document.querySelector('form');
  if (!form) return false;

  const buttons = form.querySelectorAll('button');
  for (const btn of buttons) {
    const text = (btn as HTMLElement).innerText?.trim() ?? '';
    if (text === label) {
      btn.click();
      await new Promise((r) => setTimeout(r, 300));
      console.log(`[GrokAuto] Clicked chip: "${label}"`);
      return true;
    }
  }
  console.warn(`[GrokAuto] Chip not found: "${label}"`);
  return false;
}

/**
 * Set video duration chip (6s / 10s)
 */
export async function setVideoDuration(duration: number): Promise<boolean> {
  return clickFormChip(`${duration}s`);
}

/**
 * Set video resolution chip (480p / 720p)
 */
export async function setVideoResolution(resolution: '480p' | '720p'): Promise<boolean> {
  return clickFormChip(resolution);
}

/**
 * Find the LAST (most recent) "추가 옵션" / "More options" / ellipsis button.
 */
function findMoreOptionsButton(): HTMLElement | null {
  // Strategy 1: aria-label (Korean / English) — use LAST match
  const allByLabel = document.querySelectorAll(
    'button[aria-label="추가 옵션"], button[aria-label="More options"]'
  );
  if (allByLabel.length > 0) {
    return allByLabel[allByLabel.length - 1] as HTMLElement;
  }

  // Strategy 2: last toolbar's last button (ellipsis is always last)
  const toolbars = document.querySelectorAll('[class*="absolute"][class*="inset-y-0"][class*="right-"]');
  if (toolbars.length > 0) {
    const lastToolbar = toolbars[toolbars.length - 1];
    const buttons = lastToolbar.querySelectorAll('button');
    if (buttons.length > 0) {
      return buttons[buttons.length - 1] as HTMLElement;
    }
  }

  // Strategy 3: button with aria-haspopup="menu" + ellipsis SVG — LAST
  const menuBtns = document.querySelectorAll('button[aria-haspopup="menu"]');
  for (let i = menuBtns.length - 1; i >= 0; i--) {
    const btn = menuBtns[i];
    if (btn.querySelector('circle') || btn.querySelector('.lucide-ellipsis')) {
      return btn as HTMLElement;
    }
  }

  return null;
}

/**
 * Wait for a Radix menu portal to appear in the DOM after clicking a trigger.
 */
function waitForMenuPortal(timeoutMs: number = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if already exists
    const existing = document.querySelector('[data-radix-popper-content-wrapper]');
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const observer = new MutationObserver(() => {
      if (settled) return;
      const portal = document.querySelector('[data-radix-popper-content-wrapper]');
      if (portal) {
        settled = true;
        observer.disconnect();
        resolve(portal);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);
  });
}

/**
 * Click "동영상 업스케일" in the menu via "추가 옵션" button.
 */
export async function clickVideoUpscale(): Promise<boolean> {
  // Step 1: Wait for the more-options button (retry up to 30s)
  let moreBtn: HTMLElement | null = null;
  const maxWait = 30000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    moreBtn = findMoreOptionsButton();
    if (moreBtn) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!moreBtn) {
    console.warn('[GrokAuto] More options button not found after 30s');
    return false;
  }

  // Step 2: Open the menu — try multiple click strategies
  const portalCountBefore = document.querySelectorAll('[data-radix-popper-content-wrapper]').length;

  for (let clickAttempt = 0; clickAttempt < 3; clickAttempt++) {
    console.log(`[GrokAuto] Opening more-options menu (attempt ${clickAttempt + 1})`);

    if (clickAttempt === 0) {
      // First try: full pointer event simulation
      simulateRealClick(moreBtn);
    } else if (clickAttempt === 1) {
      // Second try: focus + click
      moreBtn.focus();
      await new Promise((r) => setTimeout(r, 100));
      moreBtn.click();
    } else {
      // Third try: dispatchEvent click only
      moreBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    // Wait for menu portal to appear
    const portal = await waitForMenuPortal(2000);

    // Check if a NEW portal appeared
    const portalCountAfter = document.querySelectorAll('[data-radix-popper-content-wrapper]').length;
    const menuOpened = portal !== null || portalCountAfter > portalCountBefore;

    // Also check if the button's aria-expanded changed
    const expanded = moreBtn.getAttribute('aria-expanded') === 'true' ||
                     moreBtn.getAttribute('data-state') === 'open';

    console.log(`[GrokAuto] Menu state: portal=${!!portal}, expanded=${expanded}, portals=${portalCountBefore}→${portalCountAfter}`);

    if (menuOpened || expanded) {
      await new Promise((r) => setTimeout(r, 500));
      break;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // Step 3: Search for the upscale menu item
  const findAndClickUpscale = (): boolean => {
    // Priority 1: Search [role="menuitem"] elements ONLY (avoid clicking wrapper)
    const allMenuItems = document.querySelectorAll('[role="menuitem"]');
    const menuTexts: string[] = [];

    for (const item of allMenuItems) {
      const text = (item as HTMLElement).innerText?.trim() ?? '';
      menuTexts.push(text);
      if (text.includes('업스케일') || text.toLowerCase().includes('upscale')) {
        simulateRealClick(item as HTMLElement);
        console.log(`[GrokAuto] Clicked upscale menuitem: "${text}"`);
        return true;
      }
    }

    console.log(`[GrokAuto] menuitems (${allMenuItems.length}): ${JSON.stringify(menuTexts)}`);

    // Priority 2: Search inside [data-radix-menu-content] for clickable divs
    const menuContents = document.querySelectorAll('[data-radix-menu-content]');
    for (let i = menuContents.length - 1; i >= 0; i--) {
      const menu = menuContents[i];
      // Direct children that are clickable (not separator)
      const children = menu.querySelectorAll(':scope > div:not([role="separator"])');
      for (const child of children) {
        const text = (child as HTMLElement).innerText?.trim() ?? '';
        if (text.includes('업스케일') || text.toLowerCase().includes('upscale')) {
          simulateRealClick(child as HTMLElement);
          console.log(`[GrokAuto] Clicked upscale (menu child): "${text}"`);
          return true;
        }
      }
    }

    return false;
  };

  // Try multiple times with delays
  for (let attempt = 0; attempt < 5; attempt++) {
    if (findAndClickUpscale()) return true;
    await new Promise((r) => setTimeout(r, 600));
  }

  // Close menu
  document.body.click();
  console.warn('[GrokAuto] Upscale option not found in menu');
  return false;
}

/**
 * Wait for video upscaling to complete.
 */
export async function waitForUpscaleComplete(timeoutMs: number = 180000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const getVideoSrc = (): string => {
      const videos = document.querySelectorAll('video');
      const lastVideo = videos[videos.length - 1];
      if (!lastVideo) return '';
      return lastVideo.src || lastVideo.querySelector('source')?.src || '';
    };

    const initialSrc = getVideoSrc();
    let lastChangeTime = Date.now();

    const observer = new MutationObserver(() => {
      lastChangeTime = Date.now();
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const check = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const sinceLastChange = Date.now() - lastChangeTime;

      // Check if "업스케일링" overlay is still visible
      const isUpscaling = !!Array.from(document.querySelectorAll('span, div, p')).find(
        (el) => {
          const text = (el as HTMLElement).innerText?.trim() ?? '';
          return text === '업스케일링' || text === 'Upscaling';
        }
      );

      if (!isUpscaling && elapsed > 5000 && sinceLastChange > 3000) {
        clearInterval(check);
        observer.disconnect();
        console.log(`[GrokAuto] Video upscale complete (${Math.round(elapsed / 1000)}s)`);
        resolve(true);
        return;
      }

      const currentSrc = getVideoSrc();
      if (initialSrc && currentSrc && currentSrc !== initialSrc && sinceLastChange > 3000) {
        clearInterval(check);
        observer.disconnect();
        console.log(`[GrokAuto] Video upscale complete — src changed (${Math.round(elapsed / 1000)}s)`);
        resolve(true);
        return;
      }

      if (elapsed > 15000 && sinceLastChange > 8000) {
        clearInterval(check);
        observer.disconnect();
        console.log(`[GrokAuto] Video upscale complete — DOM stable fallback (${Math.round(elapsed / 1000)}s)`);
        resolve(true);
        return;
      }

      if (elapsed > timeoutMs) {
        clearInterval(check);
        observer.disconnect();
        console.warn('[GrokAuto] Video upscale timed out');
        resolve(false);
        return;
      }
    }, 2000);
  });
}

/**
 * Click the LAST video download button.
 */
export async function clickVideoDownload(): Promise<boolean> {
  const maxWait = 10000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const btns = document.querySelectorAll(
      'button[aria-label="다운로드"], button[aria-label="Download"]'
    );
    if (btns.length > 0) {
      const btn = btns[btns.length - 1] as HTMLElement;
      simulateRealClick(btn);
      console.log(`[GrokAuto] Clicked download button (${btns.length} found, using last)`);
      return true;
    }

    const toolbars = document.querySelectorAll('[class*="absolute"][class*="inset-y-0"][class*="right-"]');
    if (toolbars.length > 0) {
      const lastToolbar = toolbars[toolbars.length - 1];
      const buttons = lastToolbar.querySelectorAll('button');
      for (const b of buttons) {
        const paths = b.querySelectorAll('path');
        for (const p of paths) {
          const d = p.getAttribute('d') || '';
          if (d.includes('3v12') || d.includes('3V12') || d.includes('v12')) {
            simulateRealClick(b as HTMLElement);
            console.log('[GrokAuto] Clicked download button (SVG path match)');
            return true;
          }
        }
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn('[GrokAuto] Download button not found after 10s');
  return false;
}
