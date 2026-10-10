import { useEffect, useRef, useState } from 'react';
import { Icon, MenuPumpkin } from './parts.jsx';

// 遊び方のスライド。まだはじめていない人にはサイトを開いたときに最初に出し、説明の画面などから何度でも開ける。
// かぼちゃの口の中にカードを出し、閉じると上あごが下りて口が閉じ、口の中へ吸いこまれてから元の画面に戻る。
// 図はすべて HTML と CSS で描いている（画像ファイルは使わない）

// 3×3 の小さな盤面。on = 埋まったマス番号、line = そろった列のマス番号、labels = マスに出す文字
function MiniGrid({ on = [], line = [], labels = {} }) {
  return (
    <div className="rd-fig-grid" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`${on.includes(i) ? 'is-on' : ''}${line.includes(i) ? ' is-line' : ''}`}>{labels[i] ?? ''}</span>
      ))}
    </div>
  );
}

const SLIDES = [
  {
    title: 'CodeFlow スタンプラリーへようこそ',
    text: '会場のスポットでスタンプを集めて、3×3 のビンゴカードを埋めていきます。',
    fig: <MiniGrid on={[1, 4]} labels={{ 1: '済', 4: '済' }} />,
  },
  {
    title: 'QR コード・NFC タグを読み込む',
    text: 'スポットに置いてある QR コードか NFC タグを読み込むと、スタンプがもらえます。ビンゴの画面の「QR・NFC読込」から読み込んでください。',
    fig: (
      <div className="rd-fig-row" aria-hidden="true">
        <span className="rd-fig-phone"><Icon name="scan" /></span>
        <span className="rd-fig-waves">)))</span>
        <span className="rd-fig-tag">QR<br />NFC</span>
      </div>
    ),
  },
  {
    title: '同じ種類のマスが埋まる',
    text: 'マスは「飲食」「企画」「CodeFlow」の3種類。スタンプをもらったお店と同じ種類の、空いているマスが1つ埋まります。',
    fig: (
      <div className="rd-fig-row" aria-hidden="true">
        <span className="rd-fig-chips"><span>飲食</span><span>企画</span><span>CodeFlow</span></span>
        <span className="rd-fig-arrow">→</span>
        <MiniGrid on={[1, 4]} labels={{ 0: '企', 1: '飲', 2: '飲', 3: '企', 4: 'C', 5: '飲', 6: '企', 7: '飲', 8: '企' }} />
      </div>
    ),
  },
  {
    title: '1列そろったら景品と交換',
    text: '縦・横・ななめのどれか1列がそろうとビンゴ。景品の画面を交換場所のスタッフに見せてください。',
    fig: (
      <div className="rd-fig-row" aria-hidden="true">
        <MiniGrid on={[0, 1, 2, 4]} line={[0, 1, 2]} labels={{ 0: '済', 1: '済', 2: '済', 4: '済' }} />
        <span className="rd-fig-arrow">→</span>
        <span className="rd-fig-gift"><Icon name="prize" /></span>
      </div>
    ),
  },
  {
    title: '画面の移動はかぼちゃから',
    text: '画面のすみにあるかぼちゃを押すと口が開いて、ビンゴ・読込・景品・説明へ移動できます。長押しして動かすと、好きな角に置けます。',
    fig: (
      <div className="rd-fig-at" aria-hidden="true">
        <span className="rd-fig-at-btn"><MenuPumpkin /></span>
        <span className="rd-fig-at-item" style={{ left: 2, top: 18 }}>ビンゴ</span>
        <span className="rd-fig-at-item" style={{ left: 47, top: 30 }}>読込</span>
        <span className="rd-fig-at-item" style={{ left: 80, top: 63 }}>景品</span>
        <span className="rd-fig-at-item" style={{ left: 92, top: 108 }}>説明</span>
      </div>
    ),
  },
];

// 閉じるときの演出の長さ（ms）。closing: 口が閉じる / zoom: 口の中へ吸いこまれる / fade: 暗い幕が消える
const PHASE_MS = { closing: 1200, zoom: 1000, fade: 500 };
const NEXT_PHASE = { closing: 'zoom', zoom: 'fade', fade: 'done' };
const REDUCED = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// かぼちゃの上あご（目と魔女の帽子つき）と下あご。幅390pxで描き、広い画面では左右を同じ色でのばす
function UpperJaw() {
  return (
    <svg className="rd-pk-jaw" width="390" height="230" viewBox="0 0 390 230" aria-hidden="true">
      <defs>
        <clipPath id="rd-pk-clip-t"><path d="M-60 150 Q-64 66 70 50 Q195 32 320 50 Q454 66 450 150 V172 L430 200 L410 172 L372 214 L350 176 L318 206 L300 172 L262 222 L240 168 L214 200 L196 174 L170 218 L146 170 L120 204 L98 176 L70 212 L46 168 L22 200 L-20 172 L-40 200 L-60 172 Z" /></clipPath>
      </defs>
      <g clipPath="url(#rd-pk-clip-t)">
        <rect x="-60" y="0" width="510" height="240" fill="#D8622A" />
        <ellipse cx="195" cy="200" rx="270" ry="250" fill="#E5712A" />
        <ellipse cx="190" cy="190" rx="210" ry="205" fill="#EE7A2B" />
        <path d="M-60 40 L58 40 Q-60 200 58 380 L-60 380 Z" fill="#CF5D24" />
        <path d="M450 40 L332 40 Q450 200 332 380 L450 380 Z" fill="#CF5D24" />
        <path d="M150 50 Q66 200 142 360 Q92 200 162 50 Z" fill="#F59A52" />
        <path d="M190 44 Q170 190 188 330 Q198 190 204 44 Z" fill="#F8AE6E" />
        <path d="M262 50 Q340 200 272 360 Q324 200 250 50 Z" fill="#F28A3C" />
        <g fill="#B9501E">
          <path d="M158 36 Q4 200 150 380 L159 380 Q14 200 167 36 Z" />
          <path d="M185 34 Q116 200 180 384 L188 384 Q125 200 193 34 Z" />
          <path d="M205 34 Q274 200 210 384 L202 384 Q265 200 197 34 Z" />
          <path d="M232 36 Q386 200 240 380 L231 380 Q376 200 223 36 Z" />
        </g>
      </g>
      <g transform="translate(0 5)" fill="#9C4416"><path d="M96 158 L128 106 L160 160 Z" /><path d="M230 160 L262 106 L294 158 Z" /></g>
      <g fill="#F4C451"><path d="M96 158 L128 106 L160 160 Z" /><path d="M230 160 L262 106 L294 158 Z" /></g>
      <g fill="#FBE08A"><path d="M112 152 L128 122 L144 154 Z" /><path d="M246 154 L262 122 L278 152 Z" /></g>
      <path d="M96 52 C120 -40 150 -140 210 -230 C240 -270 290 -290 330 -270 C296 -262 268 -240 254 -200 C240 -120 268 -40 296 50 Z" fill="#241A2B" />
      <path d="M118 -20 C150 -90 180 -150 214 -220 C196 -150 176 -80 160 -10 Z" fill="#33263D" />
      <path d="M104 22 Q200 2 290 22 L296 50 Q200 30 98 50 Z" fill="#6A3B8A" />
      <path d="M178 14 L210 12 L212 42 L180 44 Z" fill="none" stroke="#F4C451" strokeWidth="5" strokeLinejoin="round" />
      <path d="M-60 66 Q30 34 195 34 Q360 34 450 66 Q360 84 195 82 Q30 84 -60 66 Z" fill="#241A2B" />
      <path d="M-60 66 Q30 34 195 34 Q360 34 450 66 Q360 52 195 50 Q30 52 -60 66 Z" fill="#33263D" />
    </svg>
  );
}

function LowerJaw() {
  return (
    <svg className="rd-pk-jaw" width="390" height="210" viewBox="0 0 390 210" aria-hidden="true">
      <defs>
        <clipPath id="rd-pk-clip-b"><path d="M-60 48 L-40 14 L-20 52 L10 48 L34 8 L58 46 L84 16 L110 52 L140 4 L162 50 L186 22 L208 48 L232 6 L258 52 L282 14 L306 50 L334 10 L356 46 L380 20 L410 48 L430 12 L450 48 L450 700 L-60 700 Z" /></clipPath>
      </defs>
      <g clipPath="url(#rd-pk-clip-b)">
        <rect x="-60" y="-20" width="510" height="740" fill="#D8622A" />
        <g transform="translate(0 -110)">
          <ellipse cx="195" cy="200" rx="270" ry="250" fill="#E5712A" />
          <ellipse cx="190" cy="190" rx="210" ry="205" fill="#EE7A2B" />
          <path d="M-60 40 L58 40 Q-60 200 58 380 L-60 380 Z" fill="#CF5D24" />
          <path d="M450 40 L332 40 Q450 200 332 380 L450 380 Z" fill="#CF5D24" />
          <path d="M150 50 Q66 200 142 360 Q92 200 162 50 Z" fill="#F59A52" />
          <path d="M190 44 Q170 190 188 330 Q198 190 204 44 Z" fill="#F8AE6E" />
          <path d="M262 50 Q340 200 272 360 Q324 200 250 50 Z" fill="#F28A3C" />
          <path d="M-60 290 Q195 250 450 290 V600 H-60 Z" fill="#C2541F" opacity="0.55" />
          <g fill="#B9501E">
            <path d="M158 36 Q4 200 150 380 L159 380 Q14 200 167 36 Z" />
            <path d="M185 34 Q116 200 180 384 L188 384 Q125 200 193 34 Z" />
            <path d="M205 34 Q274 200 210 384 L202 384 Q265 200 197 34 Z" />
            <path d="M232 36 Q386 200 240 380 L231 380 Q376 200 223 36 Z" />
          </g>
        </g>
      </g>
      <path d="M-60 48 L-40 14 L-20 52 L10 48 L34 8 L58 46 L84 16 L110 52 L140 4 L162 50 L186 22 L208 48 L232 6 L258 52 L282 14 L306 50 L334 10 L356 46 L380 20 L410 48 L430 12 L450 48" fill="none" stroke="#9C4416" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// closable: 「閉じる」とEscキーで閉じられるか（最初に開いたときは閉じられず、「はじめる」で進む）
// onStart: 「はじめる」で呼ぶ処理（ユーザーIDの発行）。true が返ったら閉じる演出に進み、false ならそのまま残る
// startError: 「はじめる」に失敗したときの文。最後のページのボタンの上に出す
export default function Guide({ onClose, onStart, startError = '', closable = true }) {
  const [index, setIndex] = useState(0);
  // open: カードを表示中 → closing → zoom → fade → done（onClose を呼ぶ）
  const [phase, setPhase] = useState('open');
  const dialog = useRef(null);
  const swipe = useRef(null);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(SLIDES.length - 1, i + 1));
  // 閉じる：動きを減らす設定なら演出なしですぐ閉じる
  const leave = () => {
    if (phase !== 'open') return;
    if (REDUCED) onClose();
    else setPhase('closing');
  };
  // キー操作と演出のタイマーからは、いつも最新の関数を呼ぶ（親が描き直してもタイマーをやり直さない）
  // 「はじめる」：IDを発行してから閉じる（発行中は二度押しできない）
  const [starting, setStarting] = useState(false);
  const begin = async () => {
    if (phase !== 'open' || starting) return;
    if (onStart) {
      setStarting(true);
      const ok = await onStart();
      setStarting(false);
      if (!ok) return;
    }
    leave();
  };
  const leaveRef = useRef(leave);
  const onCloseRef = useRef(onClose);
  const closableRef = useRef(closable);
  useEffect(() => { leaveRef.current = leave; onCloseRef.current = onClose; closableRef.current = closable; });

  useEffect(() => { dialog.current?.focus(); }, []);

  // 演出を順に進め、最後に閉じる
  useEffect(() => {
    if (phase === 'open') return undefined;
    if (phase === 'done') { onCloseRef.current(); return undefined; }
    const t = setTimeout(() => setPhase(NEXT_PHASE[phase]), PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (closableRef.current) leaveRef.current(); }
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 図のところを左右にスワイプしてもページを送れる
  const onPointerDown = (e) => { swipe.current = e.clientX; };
  const onPointerUp = (e) => {
    if (swipe.current == null) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (dx < -40) next();
    else if (dx > 40) prev();
  };

  return (
    <div className={`rd-pk is-${phase}`}>
      <div className="rd-pk-zoom">
        <svg className="rd-pk-inside" viewBox="0 200 390 460" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0" y="200" width="390" height="460" fill="#3B2340" />
          <path d="M40 300 L120 236 L230 248 L340 290 L362 420 L330 560 L220 612 L110 600 L34 520 L22 400 Z" fill="#E0A53C" />
          <path d="M70 330 L150 270 L250 284 L322 330 L334 440 L300 540 L210 580 L120 566 L60 500 L52 400 Z" fill="#F4C451" />
          <path d="M120 380 L190 330 L270 350 L292 430 L262 510 L180 532 L118 494 L104 430 Z" fill="#FBE08A" />
        </svg>
        <div className="rd-pk-bot"><LowerJaw /></div>
        <div className="rd-pk-top"><UpperJaw /></div>
      </div>

      {phase === 'open' && (
        <section className="rd-guide" role="dialog" aria-modal="true" aria-labelledby="rd-guide-title" tabIndex={-1} ref={dialog}>
          <header className="rd-guide-head">
            <span className="rd-guide-count">遊び方 {index + 1} / {SLIDES.length}</span>
            {closable && <button type="button" className="rd-guide-close" onClick={leave}>閉じる</button>}
          </header>
          <div className="rd-guide-fig" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
            {slide.fig}
          </div>
          <h2 id="rd-guide-title">{slide.title}</h2>
          <p>{slide.text}</p>
          <div className="rd-guide-dots" aria-hidden="true">
            {SLIDES.map((s, i) => <span key={s.title} className={i === index ? 'is-on' : ''}></span>)}
          </div>
          {last && startError && <p className="rd-guide-err" role="alert">{startError}</p>}
          <div className="rd-row">
            <button type="button" className="rd-btn rd-btn--line" onClick={prev} disabled={index === 0}>戻る</button>
            {last
              ? <button type="button" className="rd-btn rd-btn--pri" onClick={begin} disabled={starting}>{starting ? '準備中…' : 'はじめる'}</button>
              : <button type="button" className="rd-btn rd-btn--pri" onClick={next}>次へ</button>}
          </div>
        </section>
      )}
    </div>
  );
}
