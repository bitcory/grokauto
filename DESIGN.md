# GrokAuto 디자인 시스템

## 컬러 팔레트

| 역할 | 색상 | Hex |
|------|------|-----|
| Primary (CTA, 활성) | Indigo | `#6366F1` |
| Secondary | Purple | `#7C3AED` |
| Success | Green | `#10B981` |
| Warning / Running | Amber | `#F59E0B` |
| Danger / Stop | Red | `#EF4444` |
| Background | Blue-gray | `#EEF0F8` |
| Surface (카드) | White | `#FFFFFF` |
| Muted Background | Light gray | `#F3F4F9` |
| Content2 | Secondary bg | `#E8EBF5` |
| Border | Soft gray | `#DDE1EF` |
| Text (주) | Dark navy | `#1E2030` |
| Text (보조) | Gray | `#64748B` |

---

## 폰트

- **Family:** Pretendard Variable → Pretendard → Noto Sans KR → system-ui (sans-serif)
- **Antialiasing:** `-webkit-font-smoothing: antialiased`
- **Word-break:** `keep-all` (한국어 줄바꿈 처리)

| 용도 | 클래스 |
|------|--------|
| 섹션 레이블 | `text-[10px] font-semibold uppercase tracking-wider` |
| 소형 레이블 | `text-[9px]` |
| 극소형 | `text-[8px]` |
| 본문 소 | `text-xs` |
| 본문 중 | `text-sm` |
| 제목 | `text-sm font-bold` / `text-lg font-extrabold` |

---

## 핵심 컴포넌트 클래스

| 클래스 | 용도 |
|--------|------|
| `.neo-card` | 기본 카드 — 흰배경, 1px border, subtle shadow |
| `.neo-card-hover` | 호버 시 translateY(-1px) + 그림자 상승 |
| `.neo-btn` | 버튼 base — transition, hover 1px 상승, press feedback |
| `.glass-card` | 반투명 frosted glass 카드 (backdrop-blur) |
| `.memphis-input` | 텍스트 인풋 — focus 시 indigo border + `rgba(99,102,241,0.12)` glow |
| `.memphis-select` | 커스텀 셀렉트 — SVG chevron, primary focus ring |
| `.memphis-badge` | 인라인 배지 — 10px, full-rounded, 색상 변형 지원 |

---

## 버튼 변형

```tsx
// Primary CTA
className="neo-btn px-5 py-2.5 gap-2 bg-primary text-white border-transparent shadow-neo-sm-primary"

// Secondary
className="neo-btn px-2.5 py-1.5 gap-1 bg-primary/10 text-primary border border-primary/30"

// Ghost / Muted
className="neo-btn px-2 py-1 gap-1 bg-white text-foreground border border-border hover:bg-muted"

// Danger / Stop
className="neo-btn bg-danger text-white border-transparent shadow-[0_4px_12px_rgba(239,68,68,0.35)]"
```

---

## 그림자 시스템

```
shadow-neo-sm        : 0 1px 3px rgba(30,32,48,0.05), 0 4px 12px rgba(30,32,48,0.06)
shadow-neo-md        : 0 2px 8px rgba(30,32,48,0.07), 0 8px 24px rgba(30,32,48,0.08)
shadow-neo-lg        : 0 4px 16px rgba(30,32,48,0.09), 0 16px 40px rgba(30,32,48,0.10)
shadow-neo-sm-primary: 0 4px 12px rgba(99,102,241,0.35)   ← 인디고 glow
shadow-neo-md-primary: 0 6px 18px rgba(99,102,241,0.45)
```

---

## 애니메이션

| 이름 | 지속 | 설명 |
|------|------|------|
| `card-enter` | 300ms | translateY 8px→0 + opacity 0→1, ease-out (카드 목록 등장) |
| `scale-in` | 200ms | scale 0.95→1 + opacity 0→1, ease-out (모달/팝업) |
| `fade-in` | 200ms | opacity 0→1, ease-out |
| `slide-up` | 200ms | translateY 4px→0 + opacity 0→1, ease-out |
| `.card-stagger` | — | 자식 요소 50ms 간격 stagger (최대 8개 자동 딜레이) |

---

## 레이아웃 & 스페이싱

| 패턴 | 클래스 |
|------|--------|
| 섹션 패딩 | `px-4 py-3` / `px-4 py-2` |
| 설정 카드 패딩 | `p-3` |
| 리스트 아이템 패딩 | `p-1.5` |
| 컴포넌트 간격 | `gap-2`, `gap-1.5`, `gap-1` |
| 자식 수직 간격 | `space-y-2`, `space-y-1.5`, `space-y-1` |
| 스크롤바 | 4px 너비, `var(--border)` thumb, hover 시 muted-foreground |
| 하단 버튼 바 | sticky, `border-t border-border bg-white shadow-[0_-1px_8px...]` |

---

## 상태별 색상 코딩

| 상태 | 색상 | 배지 예시 |
|------|------|-----------|
| Pending | Muted gray | `bg-muted text-muted-foreground` |
| Running | Amber + pulse | `bg-warning/20 text-warning border-warning/40` |
| Completed | Green | `bg-success/20 text-success border-success/40` |
| Failed | Red | `bg-danger/20 text-danger border-danger/40` |
| Selected | Indigo ring | `ring-1 ring-primary` |

---

## 글로벌 스타일 (index.css)

```css
/* Reset */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* 스크롤바 */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }

/* Focus */
*:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* 텍스트 선택 */
::selection { background-color: rgba(99, 102, 241, 0.18); color: var(--foreground); }

/* 체크박스 */
input[type="checkbox"] { accent-color: var(--primary); }
```

---

## 구성 컴포넌트 목록

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `Header` | `components/Header.tsx` | 로고, 버전 배지, 언어 셀렉터, 캐시 새로고침 |
| `TabNav` | `components/TabNav.tsx` | Control / Settings 탭 전환 |
| `ModeSelector` | `components/ModeSelector.tsx` | 생성 모드 선택, 리사이즈 비율 |
| `PromptInput` | `components/PromptInput.tsx` | 멀티 프롬프트 입력, 텍스트 파일 업로드 |
| `ImageUpload` | `components/ImageUpload.tsx` | 드래그앤드롭 이미지 업로드, 순서 변경 |
| `PromptList` | `components/PromptList.tsx` | 파싱된 프롬프트 카드 목록, 이미지 참조 모드 선택 |
| `OutputSettings` | `components/OutputSettings.tsx` | 출력 수, 저장 폴더, 자동 이름 변경 |
| `PromptQueue` | `components/PromptQueue.tsx` | 큐 관리 (대기/실행/완료/실패), 배치 선택 |
| `ActionButtons` | `components/ActionButtons.tsx` | 하단 Clear / Start / Stop 버튼 |
| `SettingsPanel` | `components/SettingsPanel.tsx` | 기본 모드, 동시성, 딜레이, 비율, 품질 등 설정 |
| `TalkingVideoPanel` | `components/TalkingVideoPanel.tsx` | 토킹 비디오 모드 전용 패널 |
| `CinematicIntroPanel` | `components/CinematicIntroPanel.tsx` | JSON 기반 시네마틱 인트로 씬 편집기 |
| `NotGrokPage` | `components/NotGrokPage.tsx` | grok.com 외부 접근 시 폴백 화면 |
