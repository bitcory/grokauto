import type { GenerationMode } from '../../types';

/**
 * Mode label mappings for finding UI buttons by text content
 */
const MODE_LABELS: Record<GenerationMode, string[]> = {
  'text-to-video': ['비디오', 'Video'],
  'frame-to-video': ['비디오', 'Video'],
  'remix-video': ['비디오', 'Video'],
  'text-to-image': ['이미지', 'Image'],
  'image-to-image': ['이미지', 'Image'],
  'resize': ['이미지', 'Image'], // resize uses image-to-image mode on grok.com
  'talking-video': ['비디오', 'Video'], // talking-video generates frame-to-video prompts
};

/**
 * Switch grok.com to the specified generation mode by clicking
 * the mode chip button in the input area (bottom bar).
 */
export async function switchMode(mode: GenerationMode): Promise<boolean> {
  const labels = MODE_LABELS[mode];

  // Find the form element (scope to the input form, not page-level forms)
  const input = document.querySelector('div[contenteditable="true"]');
  const form = input?.closest('form') ?? document.querySelector('form');
  if (!form) {
    console.error('[GrokAuto] Form not found for mode switch');
    return false;
  }

  // Strategy 1: Find buttons inside the form whose visible text matches a label
  const allButtons = form.querySelectorAll('button');
  console.log(`[GrokAuto] switchMode: searching ${allButtons.length} buttons in form for ${labels.join('/')}`);

  for (const btn of allButtons) {
    // Use innerText (visible text only, ignores SVG text)
    const text = (btn as HTMLElement).innerText?.trim() ?? '';
    if (!text) continue;

    for (const label of labels) {
      if (text === label || text.toLowerCase() === label.toLowerCase()) {
        console.log(`[GrokAuto] switchMode: clicking button with text "${text}"`);
        btn.click();
        await new Promise((r) => setTimeout(r, 500));

        // Also try clicking inner div (some React components need this)
        const innerDiv = btn.querySelector('div');
        if (innerDiv) {
          innerDiv.click();
          await new Promise((r) => setTimeout(r, 300));
        }
        return true;
      }
    }
  }

  // Strategy 2: Search all clickable elements (div, span, a) in the form
  const allClickable = form.querySelectorAll('div[role="button"], span[role="button"], a, [tabindex="0"]');
  for (const el of allClickable) {
    const text = (el as HTMLElement).innerText?.trim() ?? '';
    for (const label of labels) {
      if (text === label || text.toLowerCase() === label.toLowerCase()) {
        console.log(`[GrokAuto] switchMode: clicking element <${el.tagName}> with text "${text}"`);
        (el as HTMLElement).click();
        await new Promise((r) => setTimeout(r, 500));
        return true;
      }
    }
  }

  console.error(`[GrokAuto] switchMode: FAILED - no button found for mode "${mode}" (labels: ${labels.join(', ')})`);
  const formBtnTexts = Array.from(form.querySelectorAll('button')).map(
    (b) => `"${(b as HTMLElement).innerText?.trim()}"`
  );
  console.error(`[GrokAuto] Form buttons found: [${formBtnTexts.join(', ')}]`);

  return false;
}
