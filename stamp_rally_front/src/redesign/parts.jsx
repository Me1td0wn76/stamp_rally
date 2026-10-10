// redesign の画面で共通に使う部品（見た目だけ）

// アイコン。形は今の画面（components/）と同じ。nfc・scan は新しく足した
const ICONS = {
  bingo: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  qr: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01" /></>,
  nfc: <><path d="M6 8.5a5 5 0 010 7" /><path d="M9.5 6a9 9 0 010 12" /><path d="M13 3.5a13 13 0 010 17" /><circle cx="3.5" cy="12" r="1" /></>,
  // 読み込み（QR コード・NFC タグ）：四すみの枠と、読み取りの線
  scan: <><path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" /><line x1="7" y1="12" x2="17" y2="12" /></>,
  prize: <><path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /></>,
  manual: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
};

export function Icon({ name }) {
  return (
    <svg className="rd-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// 画面の見出し。back を渡すと上に「‹ 戻る」が出る
export function Title({ name, sub, back }) {
  return (
    <header className="rd-title">
      {back && <button type="button" className="rd-back" onClick={back.onClick}>‹ {back.label}</button>}
      <h1>{name}</h1>
      {sub && <span className="rd-title-sub">{sub}</span>}
    </header>
  );
}

// マスに押すかぼちゃのスタンプ（切り絵）
export function Pumpkin() {
  return (
    <svg className="rd-pumpkin" viewBox="0 0 80 70" aria-hidden="true">
      <path d="M8 30 L22 10 L58 10 L72 30 L70 58 L52 68 L28 68 L10 58 Z" fill="#EE7A2B" />
      <path d="M30 10 Q24 40 30 68 L34 68 Q28 40 34 10 Z M46 10 Q52 40 46 68 L50 68 Q56 40 50 10 Z" fill="#C8582A" />
      <path d="M36 10 L38 0 L46 2 L42 10 Z" fill="#4E6B2A" />
      <path d="M20 34 L28 22 L34 36 Z" fill="#3B2340" />
      <path d="M46 36 L52 22 L60 34 Z" fill="#3B2340" />
      <path d="M22 46 L30 52 L36 46 L42 54 L50 46 L58 50 L52 58 L28 58 Z" fill="#3B2340" />
    </svg>
  );
}

// 画面の後ろの夜空（星・こうもり）。中身の下に敷くだけ
export function Night() {
  return (
    <svg className="rd-night" viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <path d="M-10 180 L120 140 L270 150 L400 200 L400 640 L260 690 L110 680 L-10 630 Z" fill="#4A2E50" />
      <g fill="#F4C451">
        <path d="M40 90 L43 82 L46 90 L54 92 L46 95 L43 103 L40 95 L32 92 Z" />
        <path d="M250 60 L252 54 L254 60 L260 62 L254 64 L252 70 L250 64 L244 62 Z" />
        <path d="M30 760 L32 754 L34 760 L40 762 L34 764 L32 770 L30 764 L24 762 Z" />
        <path d="M360 720 L362 714 L364 720 L370 722 L364 724 L362 730 L360 724 L354 722 Z" />
      </g>
      <path d="M268 112 L275 104 L279 109 L283 105 L287 109 L291 104 L298 112 L290 110 L287 115 L283 111 L279 115 L276 110 Z" fill="#241A2B" />
    </svg>
  );
}

// 画面の外枠（夜空の上に紙を切って貼る入れ物）。来場者の画面・管理画面・エラー画面で共通
// children はスクロールする中身（.rd-scroll）に入る。scrollKey を変えると中身を作り直す（画面を切り替えたときの出てくる動き）
// before は夜空とスクロールの間（後ろで動くおばけなど）、after はスクロールの上に重ねるもの（メニュー・遊び方など）
// className は外側の .rd に足す（管理画面の ad など）
// AssistiveTouch は .closest('.rd-frame') でこの枠の大きさを測っているので、.rd-frame のクラス名は変えないこと
export function Frame({ className, scrollKey, before, after, children }) {
  return (
    <div className={className ? `rd ${className}` : 'rd'}>
      <div className="rd-frame">
        <Night />
        {before}
        <main className="rd-scroll" key={scrollKey}>
          {children}
        </main>
        {after}
      </div>
    </div>
  );
}

// 画面メニューのかぼちゃ。上あご（目とへた）と下あごに分かれていて、開くと上あごが持ち上がり口の中が光る
export function MenuPumpkin() {
  return (
    <svg className="rd-mp" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse className="rd-mp-glow" cx="32" cy="36" rx="22" ry="9" />
      <g className="rd-mp-bot">
        <path d="M8 38 L12 34 L18 40 L24 34 L30 40 L36 34 L42 40 L48 34 L54 40 L58 38 L56 50 L44 59 L20 59 L8 50 Z" fill="#EE7A2B" />
        <path d="M24 40 Q22 50 26 58 L28 58 Q25 50 27 40 Z M40 40 Q42 50 38 58 L36 58 Q39 50 37 40 Z" fill="#C8582A" />
      </g>
      <g className="rd-mp-top">
        <path d="M30 13 L31 4 L38 6 L35 13 Z" fill="#4E6B2A" />
        <path d="M8 36 L6 30 L14 12 L50 12 L58 30 L58 36 L54 38 L48 32 L42 38 L36 32 L30 38 L24 32 L18 38 L12 32 Z" fill="#EE7A2B" />
        <path d="M26 13 Q22 24 25 34 L27 34 Q25 24 28 13 Z M38 13 Q42 24 39 34 L37 34 Q39 24 36 13 Z" fill="#C8582A" />
        <path d="M15 27 L21 18 L26 28 Z M38 28 L43 18 L49 27 Z" fill="#3B2340" />
        <path className="rd-mp-eye" d="M15 27 L21 18 L26 28 Z M38 28 L43 18 L49 27 Z" fill="#FBE08A" />
      </g>
    </svg>
  );
}
