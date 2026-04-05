# CLAUDE.md - GrokAuto Project Instructions

## Project Overview
Chrome extension for batch image/video generation on grok.com. Built with React + TypeScript + Vite + Zustand.

## Build & Run
```bash
npm run build    # TypeScript check + Vite build → dist/
npm run dev      # Dev server
```

## Version Management
버전을 올릴 때 아래 **4곳을 모두** 동시에 변경해야 한다:

| File | Field |
|------|-------|
| `package.json` | `"version"` |
| `manifest.json` | `"version"` |
| `src/i18n/ko.json` | `"header.version"` (형식: `"V{major}.{minor}.{patch}"`) |
| `src/i18n/en.json` | `"header.version"` (형식: `"V{major}.{minor}.{patch}"`) |

## Project Structure
```
src/
  popup/components/   # React UI components (side panel)
  content/            # Content script injected into grok.com
    dom/              # DOM manipulation helpers
    utils/            # Delay, etc.
    automator.ts      # Main automation loop
  background/         # Service worker (download routing, message relay)
  store/              # Zustand stores (useAppStore, useQueueStore)
  i18n/               # ko.json, en.json
  types/              # TypeScript type definitions
manifest.json         # Chrome extension manifest v3
```

## Key Architecture
- **Popup (Side Panel)** → sends `START_AUTOMATION` message
- **Background** → routes messages between popup ↔ content script, intercepts downloads
- **Content Script** → runs automation on grok.com (type prompt, upload images, wait, download)
- **State**: Zustand store (`useAppStore`) for all persistent UI state

## Coding Conventions
- Korean comments are OK
- Use Tailwind CSS classes (neo-brutalism style)
- i18n: all UI strings go in `ko.json` and `en.json`
- Prefer editing existing files over creating new ones
