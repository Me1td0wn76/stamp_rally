import { useEffect, useRef, useState } from 'react';
import { Icon } from './parts.jsx';

// 遊び方のスライド（ポップアップ）。初めて開いたときに自動で出し、ホームなどから何度でも開ける。
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
    title: 'NFC タグにスマホをかざす',
    text: 'スポットに置いてある NFC タグに、スマホをかざすとスタンプがもらえます。NFC の画面から読み取りを始めてください。',
    fig: (
      <div className="rd-fig-row" aria-hidden="true">
        <span className="rd-fig-phone"><Icon name="nfc" /></span>
        <span className="rd-fig-waves">)))</span>
        <span className="rd-fig-tag">NFC<br />タグ</span>
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
    title: '画面の移動は白丸から',
    text: '画面のすみにある白丸を押すと、ホーム・ビンゴ・NFC・景品へ移動できます。長押しして動かすと、好きな角に置けます。',
    fig: (
      <div className="rd-fig-at" aria-hidden="true">
        <span className="rd-fig-at-btn"></span>
        <span className="rd-fig-at-item" style={{ left: 2, top: 18 }}>ホーム</span>
        <span className="rd-fig-at-item" style={{ left: 47, top: 30 }}>ビンゴ</span>
        <span className="rd-fig-at-item" style={{ left: 80, top: 63 }}>NFC</span>
        <span className="rd-fig-at-item" style={{ left: 92, top: 108 }}>景品</span>
      </div>
    ),
  },
];

export default function Guide({ onClose }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef(null);
  const swipe = useRef(null);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(SLIDES.length - 1, i + 1));

  useEffect(() => { dialog.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    <div className="rd-guide-dim">
      <section className="rd-guide" role="dialog" aria-modal="true" aria-labelledby="rd-guide-title" tabIndex={-1} ref={dialog}>
        <header className="rd-guide-head">
          <span className="rd-guide-count">遊び方 {index + 1} / {SLIDES.length}</span>
          <button type="button" className="rd-guide-close" onClick={onClose}>閉じる</button>
        </header>
        <div className="rd-guide-fig" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
          {slide.fig}
        </div>
        <h2 id="rd-guide-title">{slide.title}</h2>
        <p>{slide.text}</p>
        <div className="rd-guide-dots" aria-hidden="true">
          {SLIDES.map((s, i) => <span key={s.title} className={i === index ? 'is-on' : ''}></span>)}
        </div>
        <div className="rd-row">
          <button type="button" className="rd-btn" onClick={prev} disabled={index === 0}>戻る</button>
          {last
            ? <button type="button" className="rd-btn rd-btn--pri" onClick={onClose}>はじめる</button>
            : <button type="button" className="rd-btn rd-btn--pri" onClick={next}>次へ</button>}
        </div>
      </section>
    </div>
  );
}
