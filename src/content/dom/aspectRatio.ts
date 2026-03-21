import type { VideoSettings } from '../../types';
import { SELECTORS, querySelector } from './selectors';

/**
 * Aspect ratio label mappings for matching dropdown menu items
 */
const ASPECT_RATIO_LABELS: Record<VideoSettings['aspectRatio'], string[]> = {
  '2:3': ['2:3', '2∶3'],
  '3:2': ['3:2', '3∶2'],
  '1:1': ['1:1', '1∶1', 'Square', '정사각형'],
  '9:16': ['9:16', '9∶16', 'Portrait', '세로'],
  '16:9': ['16:9', '16∶9', 'Landscape', '가로'],
};

/**
 * Set the aspect ratio by clicking the Radix dropdown trigger and selecting the option
 */
export async function setAspectRatio(
  aspectRatio: VideoSettings['aspectRatio']
): Promise<boolean> {
  const labels = ASPECT_RATIO_LABELS[aspectRatio];

  // Find and click the aspect ratio trigger button
  let trigger = querySelector(SELECTORS.aspectRatioTrigger);

  // Fallback: find by text content matching any aspect ratio pattern
  if (!trigger) {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent?.trim() ?? '';
      if (/\d+:\d+/.test(text) || /\d+∶\d+/.test(text)) {
        trigger = btn;
        break;
      }
    }
  }

  if (!trigger) {
    console.warn('[GrokAuto] Aspect ratio trigger not found');
    return false;
  }

  // Check if the current value already matches
  const currentText = trigger.textContent?.trim() ?? '';
  if (labels.some((l) => currentText.includes(l))) {
    console.log(`[GrokAuto] Aspect ratio already set to ${aspectRatio}`);
    return true;
  }

  // Click the trigger to open the dropdown
  (trigger as HTMLElement).click();
  await new Promise((r) => setTimeout(r, 300));

  // Find the menu item matching the desired aspect ratio
  const menuItems = document.querySelectorAll(SELECTORS.aspectRatioItem);
  for (const item of menuItems) {
    const text = item.textContent?.trim() ?? '';
    if (labels.some((label) => text.includes(label))) {
      (item as HTMLElement).click();
      await new Promise((r) => setTimeout(r, 300));
      console.log(`[GrokAuto] Aspect ratio set to ${aspectRatio}`);
      return true;
    }
  }

  // Fallback: try any clickable element in popover/menu that appeared
  const popoverItems = document.querySelectorAll(
    '[data-radix-menu-content] [role="menuitem"], [data-radix-popper-content-wrapper] button, [data-radix-popper-content-wrapper] div[role="option"]'
  );
  for (const item of popoverItems) {
    const text = item.textContent?.trim() ?? '';
    if (labels.some((label) => text.includes(label))) {
      (item as HTMLElement).click();
      await new Promise((r) => setTimeout(r, 300));
      console.log(`[GrokAuto] Aspect ratio set to ${aspectRatio} (fallback)`);
      return true;
    }
  }

  // Close the dropdown if we didn't find the option
  (trigger as HTMLElement).click();
  console.warn(`[GrokAuto] Aspect ratio option not found for ${aspectRatio}`);
  return false;
}
