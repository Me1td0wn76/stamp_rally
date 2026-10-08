// redesign の画面で共通に使う部品（見た目だけ）

// アイコン。形は今の画面（components/）と同じ。nfc だけ新しく足した
const ICONS = {
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  bingo: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  qr: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01" /></>,
  nfc: <><path d="M6 8.5a5 5 0 010 7" /><path d="M9.5 6a9 9 0 010 12" /><path d="M13 3.5a13 13 0 010 17" /><circle cx="3.5" cy="12" r="1" /></>,
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
