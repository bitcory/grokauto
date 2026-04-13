import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useQueueStore } from '../store/useQueueStore';
import Header from './components/Header';
import TabNav from './components/TabNav';
import ModeSelector from './components/ModeSelector';
import PromptInput from './components/PromptInput';
import ImageUpload from './components/ImageUpload';
import OutputSettings from './components/OutputSettings';
import PromptList from './components/PromptList';
import PromptQueue from './components/PromptQueue';
import ActionButtons from './components/ActionButtons';
import SettingsPanel from './components/SettingsPanel';
import NotGrokPage from './components/NotGrokPage';
import TalkingVideoPanel from './components/TalkingVideoPanel';
import CinematicIntroPanel from './components/CinematicIntroPanel';

function isGrokUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'grok.com' || parsed.hostname.endsWith('.grok.com');
  } catch {
    return false;
  }
}

export default function App() {
  const { i18n } = useTranslation();
  const { activeTab, language, loadFromStorage, setIsRunning } = useAppStore();
  const { updateItemStatus, updateItemProgress } = useQueueStore();
  const [isGrokTab, setIsGrokTab] = useState<boolean | null>(null);

  useEffect(() => {
    loadFromStorage().then(() => {
      const lang = useAppStore.getState().language;
      i18n.changeLanguage(lang);
    });
  }, []);

  // Check if current tab is grok.com
  useEffect(() => {
    const checkTab = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        setIsGrokTab(isGrokUrl(tabs[0]?.url));
      });
    };

    checkTab();

    // Re-check when tab changes
    const onActivated = () => checkTab();
    const onUpdated = (_tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (info.url) checkTab();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  // Listen for messages from background
  useEffect(() => {
    const listener = (message: { type: string; payload?: any }) => {
      if (message.type === 'STATUS_UPDATE' && message.payload) {
        updateItemStatus(
          message.payload.promptId,
          message.payload.status,
          message.payload.error
        );
      }
      if (message.type === 'PROGRESS_UPDATE' && message.payload) {
        updateItemProgress(message.payload.promptId, message.payload.progress, message.payload.phase);
      }
      if (message.type === 'AUTOMATION_DONE') {
        setIsRunning(false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Loading state
  if (isGrokTab === null) {
    return <div className="h-screen flex flex-col bg-background" />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      {isGrokTab ? (
        <>
          <TabNav />
          <div className="flex-1 overflow-y-auto pt-3">
            {activeTab === 'control' ? (
              <div className="card-stagger container-900 px-3 pb-3 space-y-3">
                <ModeSelector />
                <TalkingVideoPanel />
                <CinematicIntroPanel />
                <ImageUpload />
                <PromptInput />
                <PromptList />
                <OutputSettings />
                <PromptQueue />
              </div>
            ) : (
              <div className="container-900 px-3 pb-3">
                <SettingsPanel />
              </div>
            )}
          </div>
          {activeTab === 'control' && <ActionButtons />}
        </>
      ) : (
        <NotGrokPage />
      )}
    </div>
  );
}
