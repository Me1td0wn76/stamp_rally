import { useState } from 'react';

// 読み込みに失敗したときの絵。6種類から出るたびにランダムで1つ選ぶ（直前と同じものは出さない）。
// 絵とひとことの下に、どうすればよいかの文（message）を出す。再読み込みボタンは呼び出し側で置く。
// message には api/errors.js の errorMessage で作った文を渡す（サーバーのエラー文はそのまま渡さない）

// 灯りの消えたかぼちゃ（1・6 で使う）
const PumpkinOff = ({ children }) => (
  <svg viewBox="0 0 80 70" aria-hidden="true">
    <path d="M8 30 L22 10 L58 10 L72 30 L70 58 L52 68 L28 68 L10 58 Z" fill="#C8642A" />
    <path d="M30 10 Q24 40 30 68 L34 68 Q28 40 34 10 Z M46 10 Q52 40 46 68 L50 68 Q56 40 50 10 Z" fill="#A9501F" />
    <path d="M36 10 L38 0 L46 2 L42 10 Z" fill="#4E6B2A" />
    <path d="M20 34 L28 26 L34 36 Z M46 36 L52 26 L60 34 Z" fill="#241A2B" />
    <path d="M26 54 Q40 46 54 54 L52 58 Q40 52 28 58 Z" fill="#241A2B" />
    {children}
  </svg>
);
const Smoke = () => (
  <svg viewBox="0 0 28 60" aria-hidden="true"><path d="M14 60 Q2 46 14 34 Q26 22 14 10 Q8 4 12 0" stroke="#C8B6D2" strokeWidth="5" fill="none" strokeLinecap="round" /></svg>
);

const ARTS = [
  // 1 消えたろうそく：灯りの消えたかぼちゃから、けむりがゆらゆら上る
  {
    title: '灯りが消えちゃった…',
    art: (
      <div className="rd-er-art rd-er-1">
        <span className="rd-er-pk"><PumpkinOff /></span>
        <span className="rd-er-smoke"><Smoke /></span>
        <span className="rd-er-smoke rd-er-smoke--2"><Smoke /></span>
      </div>
    ),
  },
  // 2 迷子のおばけ：破れた地図を持って首をかしげ、？がぽこぽこ出る
  {
    title: '道に迷っちゃった…',
    art: (
      <div className="rd-er-art rd-er-2">
        <span className="rd-er-ghost">
          <svg viewBox="0 0 80 100" aria-hidden="true">
            <path d="M40 6 L64 18 L72 46 L74 92 L60 84 L50 94 L40 84 L28 94 L18 84 L6 92 L8 46 L16 18 Z" fill="#F6E7C8" stroke="#3B2340" strokeWidth="2" />
            <path d="M26 40 L34 38 L33 48 L25 48 Z M48 38 L56 40 L56 48 L48 48 Z" fill="#3B2340" />
            <path d="M34 62 Q40 58 46 62" stroke="#3B2340" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M50 62 L78 54 L80 78 L66 74 L60 82 L52 80 Z" fill="#E2CFA8" stroke="#8A6E4F" strokeWidth="2" />
            <path d="M58 62 L72 60 M56 70 L66 68" stroke="#EE7A2B" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        </span>
        <span className="rd-er-q rd-er-q--1">?</span>
        <span className="rd-er-q rd-er-q--2">?</span>
        <span className="rd-er-q rd-er-q--3">?</span>
      </div>
    ),
  },
  // 3 糸が切れたクモ：糸がぷつんと切れて、ひっくり返ってめまい
  {
    title: '糸が切れちゃった…',
    art: (
      <div className="rd-er-art rd-er-3">
        <span className="rd-er-thread"><svg viewBox="0 0 4 70" aria-hidden="true"><path d="M2 0 L2 52 L0 56 L3 60 L1 64" stroke="#8A6E4F" strokeWidth="2" fill="none" /></svg></span>
        <span className="rd-er-stars"><svg viewBox="0 0 80 30" aria-hidden="true"><g fill="#EE7A2B"><path d="M10 15 L12 10 L14 15 L19 17 L14 19 L12 24 L10 19 L5 17 Z" /><path d="M66 10 L68 6 L70 10 L74 12 L70 14 L68 18 L66 14 L62 12 Z" /></g></svg></span>
        <span className="rd-er-spider">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <g stroke="#241A2B" strokeWidth="2.6" strokeLinecap="round" fill="none">
              <path d="M16 18 L6 10 L2 16 M16 21 L4 20 L1 27 M17 24 L7 30 L6 37 M18 26 L12 34" />
              <path d="M24 18 L34 10 L38 16 M24 21 L36 20 L39 27 M23 24 L33 30 L34 37 M22 26 L28 34" />
            </g>
            <ellipse cx="20" cy="22" rx="7" ry="8" fill="#241A2B" /><circle cx="20" cy="12" r="5" fill="#241A2B" />
            <path d="M16.5 10 L19 12.5 M19 10 L16.5 12.5 M21 10 L23.5 12.5 M23.5 10 L21 12.5" stroke="#F4C451" strokeWidth="1.2" />
          </svg>
        </span>
      </div>
    ),
  },
  // 4 ひっくり返った大なべ：なべが倒れて、緑の中身がとろ〜っとこぼれる
  {
    title: 'こぼしちゃった…',
    art: (
      <div className="rd-er-art rd-er-4">
        <span className="rd-er-pot">
          <svg viewBox="0 0 220 150" aria-hidden="true">
            <path d="M14 46 Q110 70 206 46 L196 110 Q180 146 110 146 Q40 146 24 110 Z" fill="#241A2B" />
            <path d="M6 44 Q110 66 214 44 L214 54 Q110 78 6 54 Z" fill="#33263D" />
            <path d="M40 140 L30 150 M180 140 L190 150" stroke="#241A2B" strokeWidth="8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="rd-er-spill"><svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 Q20 0 40 10 Q60 22 80 14 Q96 10 100 22 Q80 36 50 32 Q20 30 0 26 Z" fill="#7FC24A" /></svg></span>
        {[120, 150, 176].map((x, i) => <span key={x} className="rd-er-bub" style={{ '--x': x + 'px', '--d': i * .6 + 's' }} />)}
      </div>
    ),
  },
  // 5 毛糸がからまった黒猫：通信の糸がこんがらがって、猫がじたばた
  {
    title: 'からまっちゃった…',
    art: (
      <div className="rd-er-art rd-er-5">
        <span className="rd-er-cat">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d="M10 100 L12 46 L4 12 L30 30 Q50 22 70 30 L96 12 L88 46 L90 100 Z" fill="#241A2B" />
            <path d="M28 50 L40 56 M40 50 L28 56 M60 50 L72 56 M72 50 L60 56" stroke="#F4C451" strokeWidth="3" strokeLinecap="round" />
            <path d="M44 68 Q50 64 56 68" stroke="#F2B8C6" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        <span className="rd-er-yarn">
          <svg viewBox="0 0 120 100" aria-hidden="true">
            <circle cx="60" cy="60" r="34" fill="#EE7A2B" />
            <g stroke="#C8582A" strokeWidth="3" fill="none"><path d="M30 50 Q60 30 90 52 M28 66 Q60 46 92 70 M40 88 Q56 60 86 40 M34 40 Q60 70 76 92" /></g>
            <path d="M94 60 Q120 50 108 30 Q96 14 70 26 Q40 40 20 20 Q6 8 0 20" stroke="#EE7A2B" strokeWidth="3" fill="none" />
          </svg>
        </span>
      </div>
    ),
  },
  // 6 ひびが入ったかぼちゃ：ばんそうこうを貼られて、汗をかいてしょんぼり
  {
    title: 'ちょっと調子が悪いみたい…',
    art: (
      <div className="rd-er-art rd-er-6">
        <span className="rd-er-pk">
          <PumpkinOff>
            <path d="M56 12 L50 24 L56 30 L48 42" stroke="#241A2B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <g transform="rotate(-24 52 30)">
              <rect x="40" y="25" width="24" height="10" rx="3" fill="#F2D3B0" /><rect x="48" y="25" width="8" height="10" fill="#E8BE96" />
            </g>
          </PumpkinOff>
        </span>
        <span className="rd-er-sweat"><svg viewBox="0 0 16 22" aria-hidden="true"><path d="M8 0 Q16 12 14 16 Q12 22 8 22 Q4 22 2 16 Q0 12 8 0 Z" fill="#9BD3F2" /></svg></span>
      </div>
    ),
  },
];

// 直前に出した番号（同じものが続かないように）
let lastArt = -1;
function pickArt() {
  let n = Math.floor(Math.random() * ARTS.length);
  if (n === lastArt) n = (n + 1 + Math.floor(Math.random() * (ARTS.length - 1))) % ARTS.length;
  lastArt = n;
  return n;
}

export default function LoadError({ message }) {
  // 出たときに1回だけ選ぶ（描き直しのたびに変わらないように）
  const [n] = useState(pickArt);
  const { title, art } = ARTS[n];
  return (
    <section className="rd-box rd-er" role="alert">
      {art}
      <h2>{title}</h2>
      <p className="rd-er-msg">{message}</p>
    </section>
  );
}
