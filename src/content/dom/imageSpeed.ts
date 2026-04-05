import type { ImageGenerationSpeed } from '../../types';

/**
 * Set the image generation speed option (Speed / Quality) on grok.com.
 * Finds the radiogroup by aria-label and clicks the matching radio button.
 */
export async function setImageGenerationSpeed(speed: ImageGenerationSpeed): Promise<boolean> {
  // Find the radiogroup (supports both Korean and English labels)
  const radioGroup = document.querySelector(
    '[aria-label="이미지 생성 속도"], [aria-label="Image generation speed"]'
  ) as HTMLElement | null;

  if (!radioGroup) {
    console.log('[GrokAuto] Image generation speed radiogroup not found — skipping');
    return false;
  }

  const buttons = radioGroup.querySelectorAll('button[role="radio"]');
  const targetTexts: Record<ImageGenerationSpeed, string[]> = {
    speed: ['Speed', '속도'],
    quality: ['Quality', '품질'],
  };

  for (const btn of buttons) {
    const text = (btn as HTMLElement).innerText?.trim() ?? '';
    const matches = targetTexts[speed].some((t) => text.toLowerCase().includes(t.toLowerCase()));

    if (matches) {
      // Already selected — skip
      if (btn.getAttribute('aria-checked') === 'true') {
        console.log(`[GrokAuto] Image generation speed already set to ${speed}`);
        return true;
      }

      (btn as HTMLElement).click();
      // Wait briefly and verify
      await new Promise((r) => setTimeout(r, 300));

      const checked = btn.getAttribute('aria-checked') === 'true';
      console.log(`[GrokAuto] Image generation speed set to ${speed}: ${checked}`);
      return true;
    }
  }

  console.warn(`[GrokAuto] Image generation speed "${speed}" button not found`);
  return false;
}
