/**
 * Generate a filename for auto-downloaded results
 */
export function generateFilename(
  promptText: string,
  index: number,
  type: 'image' | 'video',
  autoRename: boolean
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = type === 'video' ? 'mp4' : 'png';

  if (autoRename) {
    // Clean prompt text for filename
    const clean = promptText
      .slice(0, 50)
      .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    return `${clean}_${timestamp}_${index + 1}.${ext}`;
  }

  return `grok_${timestamp}_${index + 1}.${ext}`;
}
