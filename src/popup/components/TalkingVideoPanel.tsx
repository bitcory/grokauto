import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
import { cn } from '../../utils/cn';

export default function TalkingVideoPanel() {
  const { t } = useTranslation();
  const { mode, setMode, setPromptText, talkingVideo, setTalkingVideo, setTalkingVideoScenes } = useAppStore();

  const {
    videoType,
    characterName,
    clothing,
    setting,
    cameraAngle,
    expression,
    language,
    interviewerRole,
    scenes,
  } = talkingVideo;

  if (mode !== 'talking-video') return null;

  const isInterview = videoType === 'interview';

  const generateImagePrompt = () => {
    const name = characterName || 'character';
    const cloth = clothing || 'casual outfit';
    const bg = setting || 'blurred indoor';

    const prompt = isInterview
      ? `A photorealistic vertical 9:16 mid-shot with central framing.\n` +
        `A standing [${name}] wearing a [${cloth}]. In the foreground, a hand is holding a [small black lapel microphone] towards the ${name} from the bottom right. [${name}] and the hand are in sharp focus, while the background of a [${bg}] is extremely blurred with a heavy bokeh effect. Cinematic lighting, shallow depth of field, social media vlog style, high quality. camera angle is ${cameraAngle} shot. Eye-level camera angle. handheld shot. --ar 9:16`
      : `A photorealistic vertical 9:16 mid-shot with central framing.\n` +
        `A standing [${name}] wearing a [${cloth}], looking directly at the camera with natural expression. [${name}] is in sharp focus, while the background of a [${bg}] is extremely blurred with a heavy bokeh effect. Cinematic lighting, shallow depth of field, social media vlog style, high quality. camera angle is ${cameraAngle} shot. Eye-level camera angle. handheld shot. --ar 9:16`;

    setMode('text-to-image');
    setPromptText(prompt);
  };

  const generateVideoPrompts = () => {
    const name = characterName || 'character';
    const videoPrompts = scenes
      .filter((s) => s.characterLine.trim() || (isInterview && s.interviewerLine.trim()))
      .map((scene) => {
        const scriptLines: string[] = [];
        if (isInterview && scene.interviewerLine.trim()) {
          scriptLines.push(
            `* ${interviewerRole} (Off-screen): Professional and clear announcer tone. "${scene.interviewerLine}"`
          );
        }
        if (scene.characterLine.trim()) {
          scriptLines.push(
            `* ${name} : Speaks the ${language} script naturally: "${scene.characterLine}"`
          );
        }

        const header = isInterview
          ? `[[STRICTLY STATIC VERTICAL INTERVIEW SHOT, LOCKED CAMERA WITH ZERO ZOOM, DO NOT ZOOM IN]]`
          : `[[STRICTLY STATIC VERTICAL TALKING SHOT, LOCKED CAMERA WITH ZERO ZOOM, DO NOT ZOOM IN]]`;

        return (
          `${header}\n` +
          `[CAMERA]\n` +
          `Standing handheld style. FIXED POSITION for the entire duration. The framing must not change from the first frame. Absolutely no zooming in or out. Only microscopic, natural organic hand-jiggles.\n` +
          `[SCRIPT]\n` +
          `${scriptLines.join('\n')}\n` +
          `[SPEECH STYLE]\n` +
          `The ${name}'s ${language} pronunciation is clear and precise like an adult's.\n` +
          `[PERFORMANCE]\n` +
          `${name} with a ${expression} expression. High facial stability, consistent features. 4k, cinematic soft lighting, heavy bokeh background.`
        );
      });

    if (videoPrompts.length === 0) return;
    setMode('frame-to-video');
    setPromptText(videoPrompts.join('\n'));
  };

  const addScene = () => {
    setTalkingVideoScenes([...scenes, { id: Date.now().toString(), interviewerLine: '', characterLine: '' }]);
  };

  const removeScene = (id: string) => {
    if (scenes.length > 1) setTalkingVideoScenes(scenes.filter((sc) => sc.id !== id));
  };

  const updateScene = (
    id: string,
    field: 'interviewerLine' | 'characterLine',
    value: string
  ) => {
    setTalkingVideoScenes(scenes.map((sc) => (sc.id === id ? { ...sc, [field]: value } : sc)));
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Video Type Toggle */}
      <div className="flex gap-2">
        {(['interview', 'monologue'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTalkingVideo({ videoType: type })}
            className={cn(
              'flex-1 py-2 text-[11px] font-semibold rounded-lg border transition-all duration-200',
              videoType === type
                ? 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(99,102,241,0.3)]'
                : 'bg-white text-foreground border-border hover:bg-muted'
            )}
          >
            {t(`talkingVideo.type.${type}`)}
          </button>
        ))}
      </div>

      {/* Character Info */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
          {t('talkingVideo.characterInfo')}
        </label>
        <input
          type="text"
          placeholder={t('talkingVideo.characterPlaceholder')}
          value={characterName}
          onChange={(e) => setTalkingVideo({ characterName: e.target.value })}
          className="memphis-input !py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder={t('talkingVideo.clothingPlaceholder')}
          value={clothing}
          onChange={(e) => setTalkingVideo({ clothing: e.target.value })}
          className="memphis-input !py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder={t('talkingVideo.settingPlaceholder')}
          value={setting}
          onChange={(e) => setTalkingVideo({ setting: e.target.value })}
          className="memphis-input !py-1.5 text-xs"
        />
        <div className="flex gap-2">
          <select
            value={cameraAngle}
            onChange={(e) => setTalkingVideo({ cameraAngle: e.target.value })}
            className="memphis-select flex-1"
          >
            <option value="knee">{t('talkingVideo.camera.knee')}</option>
            <option value="mid">{t('talkingVideo.camera.mid')}</option>
            <option value="waist">{t('talkingVideo.camera.waist')}</option>
            <option value="full body">{t('talkingVideo.camera.fullBody')}</option>
          </select>
          <select
            value={language}
            onChange={(e) => setTalkingVideo({ language: e.target.value })}
            className="memphis-select flex-1"
          >
            <option value="Korean">한국어</option>
            <option value="English">English</option>
            <option value="Japanese">日本語</option>
            <option value="Chinese">中文</option>
          </select>
        </div>
        <input
          type="text"
          placeholder={t('talkingVideo.expressionPlaceholder')}
          value={expression}
          onChange={(e) => setTalkingVideo({ expression: e.target.value })}
          className="memphis-input !py-1.5 text-xs"
        />
        {isInterview && (
          <input
            type="text"
            placeholder={t('talkingVideo.interviewerPlaceholder')}
            value={interviewerRole}
            onChange={(e) => setTalkingVideo({ interviewerRole: e.target.value })}
            className="memphis-input !py-1.5 text-xs"
          />
        )}
      </div>

      {/* Scenes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('talkingVideo.scenes', { count: scenes.length })}
          </label>
          <button
            onClick={addScene}
            className="neo-btn px-2 py-1 text-[10px] gap-1 bg-white text-foreground border border-border hover:bg-muted"
          >
            <Icon icon="solar:add-circle-bold" width={12} height={12} />
            {t('talkingVideo.addScene')}
          </button>
        </div>

        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            className="border border-border rounded-xl p-2 space-y-1.5 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {t('talkingVideo.scene')} {idx + 1}
              </span>
              {scenes.length > 1 && (
                <button
                  onClick={() => removeScene(scene.id)}
                  className="text-danger hover:opacity-70 transition-opacity"
                >
                  <Icon icon="solar:trash-bin-minimalistic-bold" width={12} height={12} />
                </button>
              )}
            </div>
            {isInterview && (
              <input
                type="text"
                placeholder={t('talkingVideo.interviewerLine')}
                value={scene.interviewerLine}
                onChange={(e) => updateScene(scene.id, 'interviewerLine', e.target.value)}
                className="memphis-input !py-1 text-[11px]"
              />
            )}
            <input
              type="text"
              placeholder={t('talkingVideo.characterLine')}
              value={scene.characterLine}
              onChange={(e) => updateScene(scene.id, 'characterLine', e.target.value)}
              className="memphis-input !py-1 text-[11px]"
            />
          </div>
        ))}
      </div>

      {/* Generate Buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateImagePrompt}
          className="flex-1 neo-btn py-2 text-[11px] gap-1.5 bg-secondary/10 text-secondary border border-secondary/30"
        >
          <Icon icon="solar:gallery-bold" width={14} height={14} />
          {t('talkingVideo.genImage')}
        </button>
        <button
          onClick={generateVideoPrompts}
          className="flex-1 neo-btn py-2 text-[11px] gap-1.5 bg-primary/10 text-primary border border-primary/30"
        >
          <Icon icon="solar:videocamera-record-bold" width={14} height={14} />
          {t('talkingVideo.genVideo')}
        </button>
      </div>
    </div>
  );
}
