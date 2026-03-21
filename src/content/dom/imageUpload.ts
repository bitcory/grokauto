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
 * Upload image(s) to grok.com's upload input using DataTransfer API
 */
export async function uploadImages(dataUrls: string[]): Promise<boolean> {
  if (dataUrls.length === 0) return true;

  // Find file input
  let fileInput = document.querySelector(
    SELECTORS.imageUploadInput
  ) as HTMLInputElement | null;

  // If no file input found, try clicking upload area to reveal it
  if (!fileInput) {
    const uploadArea = querySelector([SELECTORS.imageUploadArea]);
    if (uploadArea) {
      (uploadArea as HTMLElement).click();
      await new Promise((r) => setTimeout(r, 500));
      fileInput = document.querySelector(
        SELECTORS.imageUploadInput
      ) as HTMLInputElement | null;
    }
  }

  if (!fileInput) {
    console.error('[GrokAuto] Image upload input not found');
    return false;
  }

  // Create DataTransfer with files
  const dt = new DataTransfer();
  dataUrls.forEach((url, i) => {
    const ext = url.includes('image/png') ? 'png' : 'jpg';
    const file = dataUrlToFile(url, `upload-${i}.${ext}`);
    dt.items.add(file);
  });

  // Set files on input
  fileInput.files = dt.files;

  // Dispatch change event
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for upload processing
  await new Promise((r) => setTimeout(r, 1000));
  return true;
}

/**
 * Upload images via drag-and-drop simulation
 */
export async function uploadImagesDragDrop(dataUrls: string[]): Promise<boolean> {
  if (dataUrls.length === 0) return true;

  const dropTarget =
    querySelector([SELECTORS.imageUploadArea]) ??
    querySelector(SELECTORS.promptInput);

  if (!dropTarget) {
    console.error('[GrokAuto] Drop target not found');
    return false;
  }

  const dt = new DataTransfer();
  dataUrls.forEach((url, i) => {
    const ext = url.includes('image/png') ? 'png' : 'jpg';
    const file = dataUrlToFile(url, `upload-${i}.${ext}`);
    dt.items.add(file);
  });

  // Simulate drag events
  const dragEnterEvent = new DragEvent('dragenter', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dt,
  });
  const dragOverEvent = new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dt,
  });
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dt,
  });

  dropTarget.dispatchEvent(dragEnterEvent);
  dropTarget.dispatchEvent(dragOverEvent);
  dropTarget.dispatchEvent(dropEvent);

  await new Promise((r) => setTimeout(r, 1000));
  return true;
}
