import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
import { cn } from '../../utils/cn';
import type { TalkingVideoState } from '../../types';

// 3 one-click presets to fill character/setting fields. Users copy-then-tweak.
type Preset = Pick<
  TalkingVideoState,
  'characterName' | 'clothing' | 'setting' | 'cameraAngle' | 'expression' | 'interviewerRole'
> & { key: string };

const PRESETS: Preset[] = [
  {
    key: 'babyKorean',
    characterName: '2-year-old Korean baby girl',
    clothing: 'pastel yellow knit sweater and denim overalls',
    setting: 'cozy sunlit living room with indoor plants',
    cameraAngle: 'waist',
    expression: 'bright, innocent smile',
    interviewerRole: '20s woman Interviewer',
  },
  {
    key: 'kpopTrainee',
    characterName: '20-year-old Korean female K-pop trainee',
    clothing: 'oversized white t-shirt and black athletic shorts',
    setting: 'mirrored dance practice room with warm LED lighting',
    cameraAngle: 'mid',
    expression: 'confident, determined look',
    interviewerRole: 'Music magazine reporter',
  },
  {
    key: 'officeWorker',
    characterName: '30s Korean male office worker',
    clothing: 'light-gray blazer over a white shirt, no tie',
    setting: 'modern open-plan office with soft window light',
    cameraAngle: 'waist',
    expression: 'calm, friendly professional smile',
    interviewerRole: 'News reporter',
  },
];

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="neo-card p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon icon={icon} width={14} height={14} className="text-primary" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {title}
        </h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

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

  // 처음 한 장만 펼치고 나머지는 접음. 새 Scene을 추가하면 그 Scene이 자동으로 펼쳐짐.
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(
    scenes[0]?.id ?? null
  );

  if (mode !== 'talking-video') return null;

  const isInterview = videoType === 'interview';

  const applyPreset = (p: Preset) => {
    setTalkingVideo({
      characterName: p.characterName,
      clothing: p.clothing,
      setting: p.setting,
      cameraAngle: p.cameraAngle,
      expression: p.expression,
      interviewerRole: p.interviewerRole,
    });
  };

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
    const id = Date.now().toString();
    setTalkingVideoScenes([...scenes, { id, interviewerLine: '', characterLine: '' }]);
    setExpandedSceneId(id); // 새로 추가한 씬 자동 펼치기
  };

  const removeScene = (id: string) => {
    if (scenes.length > 1) {
      const next = scenes.filter((sc) => sc.id !== id);
      setTalkingVideoScenes(next);
      if (expandedSceneId === id) setExpandedSceneId(next[0]?.id ?? null);
    }
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
      {/* ── Video Type Toggle ── */}
      <div className="flex gap-2">
        {(['interview', 'monologue'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTalkingVideo({ videoType: type })}
            className={cn(
              'flex-1 py-2 text-[11px] font-semibold rounded-lg border transition-all duration-200',
              videoType === type
                ? 'btn-green-grad text-white border-transparent'
                : 'bg-white text-foreground border-border hover:bg-muted'
            )}
          >
            {t(`talkingVideo.type.${type}`)}
          </button>
        ))}
      </div>

      {/* ── Generate Buttons (mode-switch warning included) ── */}
      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            onClick={generateImagePrompt}
            className="flex-1 neo-btn py-2 text-[11px] gap-1.5 bg-secondary/10 text-secondary border border-secondary/30"
            title={t('talkingVideo.genImageHint')}
          >
            <Icon icon="solar:gallery-bold" width={14} height={14} />
            {t('talkingVideo.genImage')}
            <Icon icon="solar:arrow-right-bold" width={10} height={10} className="opacity-60" />
          </button>
          <button
            onClick={generateVideoPrompts}
            className="flex-1 neo-btn py-2 text-[11px] gap-1.5 bg-primary/10 text-primary border border-primary/30"
            title={t('talkingVideo.genVideoHint')}
          >
            <Icon icon="solar:videocamera-record-bold" width={14} height={14} />
            {t('talkingVideo.genVideo')}
            <Icon icon="solar:arrow-right-bold" width={10} height={10} className="opacity-60" />
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground text-center leading-tight">
          {t('talkingVideo.genHint')}
        </p>
      </div>

      {/* ── Preset Chips ── */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
          {t('talkingVideo.presets')}
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className="neo-btn px-2 py-1 text-[10px] gap-1 bg-white text-foreground border border-border hover:bg-muted"
            >
              <Icon icon="solar:magic-stick-3-bold" width={11} height={11} className="text-primary" />
              {t(`talkingVideo.preset.${p.key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section: Character ── */}
      <Section title={t('talkingVideo.section.character')} icon="solar:user-bold">
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
      </Section>

      {/* ── Section: Scene ── */}
      <Section title={t('talkingVideo.section.scene')} icon="solar:gallery-wide-bold">
        <input
          type="text"
          placeholder={t('talkingVideo.settingPlaceholder')}
          value={setting}
          onChange={(e) => setTalkingVideo({ setting: e.target.value })}
          className="memphis-input !py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder={t('talkingVideo.expressionPlaceholder')}
          value={expression}
          onChange={(e) => setTalkingVideo({ expression: e.target.value })}
          className="memphis-input !py-1.5 text-xs"
        />
      </Section>

      {/* ── Section: Camera & Language ── */}
      <Section title={t('talkingVideo.section.camera')} icon="solar:camera-bold">
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
      </Section>

      {/* ── Section: Interviewer (interview mode only) ── */}
      {isInterview && (
        <Section title={t('talkingVideo.section.interviewer')} icon="solar:microphone-3-bold">
          <input
            type="text"
            placeholder={t('talkingVideo.interviewerPlaceholder')}
            value={interviewerRole}
            onChange={(e) => setTalkingVideo({ interviewerRole: e.target.value })}
            className="memphis-input !py-1.5 text-xs"
          />
        </Section>
      )}

      {/* ── Scenes (accordion) ── */}
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

        {scenes.map((scene, idx) => {
          const expanded = expandedSceneId === scene.id;
          const filled =
            scene.characterLine.trim().length > 0 ||
            (isInterview && scene.interviewerLine.trim().length > 0);
          return (
            <div
              key={scene.id}
              className="border border-border rounded-xl bg-white shadow-sm overflow-hidden"
            >
              {/* Scene header (always visible, click to toggle) */}
              <button
                onClick={() => setExpandedSceneId(expanded ? null : scene.id)}
                className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    icon="solar:alt-arrow-down-bold"
                    width={12}
                    height={12}
                    className={cn(
                      'transition-transform duration-200 text-muted-foreground',
                      expanded ? 'rotate-0' : '-rotate-90'
                    )}
                  />
                  <span className="text-[10px] font-semibold text-foreground">
                    {t('talkingVideo.scene')} {idx + 1}
                  </span>
                  {filled && (
                    <Icon
                      icon="solar:check-circle-bold"
                      width={12}
                      height={12}
                      className="text-green-500"
                    />
                  )}
                  {!expanded && scene.characterLine && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {scene.characterLine}
                    </span>
                  )}
                </div>
                {scenes.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScene(scene.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        removeScene(scene.id);
                      }
                    }}
                    className="text-danger hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <Icon icon="solar:trash-bin-minimalistic-bold" width={12} height={12} />
                  </span>
                )}
              </button>

              {/* Scene body (expanded) */}
              {expanded && (
                <div className="px-2.5 pb-2 space-y-1.5">
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
