import { SELECTORS, querySelector } from './selectors';

/**
 * Convert a data URL to a File object
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

/**
 * Convert a data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Upload image(s) to grok.com.
 * Tries multiple strategies: file input, paste, drag-drop.
 */
export async function uploadImages(dataUrls: string[]): Promise<boolean> {
  if (dataUrls.length === 0) return true;

  // Strategy 1: File input
  let fileInput = document.querySelector(
    SELECTORS.imageUploadInput
  ) as HTMLInputElement | null;

  // Also try broader file input selectors
  if (!fileInput) {
    fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
  }

  if (fileInput) {
    console.log('[GrokAuto] Uploading images via file input');
    const dt = new DataTransfer();
    dataUrls.forEach((url, i) => {
      const ext = url.includes('image/png') ? 'png' : 'jpg';
      const file = dataUrlToFile(url, `upload-${i}.${ext}`);
      dt.items.add(file);
    });
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  }

  // Strategy 2: Clipboard paste into the prompt input area
  const promptInput = querySelector(SELECTORS.promptInput) as HTMLElement | null;
  if (promptInput) {
    console.log('[GrokAuto] Uploading images via clipboard paste');
    promptInput.focus();
    await new Promise((r) => setTimeout(r, 300));

    const dt = new DataTransfer();
    dataUrls.forEach((url, i) => {
      const ext = url.includes('image/png') ? 'png' : 'jpg';
      const mime = url.includes('image/png') ? 'image/png' : 'image/jpeg';
      const blob = dataUrlToBlob(url);
      const file = new File([blob], `upload-${i}.${ext}`, { type: mime });
      dt.items.add(file);
    });

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    promptInput.dispatchEvent(pasteEvent);
    console.log('[GrokAuto] Dispatched paste event');
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  }

  // Strategy 3: Drag and drop
  const dropTarget = querySelector(SELECTORS.promptInput) ?? document.querySelector('form');
  if (dropTarget) {
    console.log('[GrokAuto] Uploading images via drag-drop');
    const dt = new DataTransfer();
    dataUrls.forEach((url, i) => {
      const ext = url.includes('image/png') ? 'png' : 'jpg';
      const file = dataUrlToFile(url, `upload-${i}.${ext}`);
      dt.items.add(file);
    });

    dropTarget.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dropTarget.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dropTarget.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  }

  console.error('[GrokAuto] Image upload: no method available');
  return false;
}
