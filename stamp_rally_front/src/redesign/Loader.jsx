import { useState } from 'react';
import { Pumpkin } from './parts.jsx';

// ロード画面の絵。6種類から出るたびにランダムで1つ選ぶ（直前と同じものは出さない）。
// size="full" はサイトを開いたときの全画面用、size="inline" は読み込み中の箱の中に小さく出す用。

const Bat = () => (
  <svg viewBox="0 0 60 30" aria-hidden="true">
    <g className="rd-ld-wing"><path d="M30 14 Q20 1 1 5 Q8 10 6 17 Q14 12 18 19 Q22 12 30 17 Z M30 14 Q40 1 59 5 Q52 10 54 17 Q46 12 42 19 Q38 12 30 17 Z" fill="#241A2B" /></g>
    <ellipse cx="30" cy="16" rx="5" ry="6.5" fill="#241A2B" />
    <path d="M26 12 L26.5 6 L29 10 Z M34 12 L33.5 6 L31 10 Z" fill="#241A2B" />
    <circle cx="28" cy="15" r="1" fill="#F4C451" /><circle cx="32" cy="15" r="1" fill="#F4C451" />
  </svg>
);

const ARTS = [
  // 1 灯がともるかぼちゃ：目→目→口の順に灯りがつき、ゆらいで、また消える
  () => (
    <div className="rd-ld-art rd-ld-1">
      <span className="rd-ld-halo" />
      <svg className="rd-ld-fill" viewBox="0 0 80 70" aria-hidden="true">
        <path d="M8 30 L22 10 L58 10 L72 30 L70 58 L52 68 L28 68 L10 58 Z" fill="#EE7A2B" />
        <path d="M30 10 Q24 40 30 68 L34 68 Q28 40 34 10 Z M46 10 Q52 40 46 68 L50 68 Q56 40 50 10 Z" fill="#C8582A" />
        <path d="M36 10 L38 0 L46 2 L42 10 Z" fill="#4E6B2A" />
        <path d="M20 34 L28 22 L34 36 Z M46 36 L52 22 L60 34 Z M22 46 L30 52 L36 46 L42 54 L50 46 L58 50 L52 58 L28 58 Z" fill="#3B2340" />
        <path className="rd-ld-lit" d="M20 34 L28 22 L34 36 Z" fill="#FBE08A" />
        <path className="rd-ld-lit rd-ld-lit--2" d="M46 36 L52 22 L60 34 Z" fill="#FBE08A" />
        <path className="rd-ld-lit rd-ld-lit--3" d="M22 46 L30 52 L36 46 L42 54 L50 46 L58 50 L52 58 L28 58 Z" fill="#FBE08A" />
      </svg>
    </div>
  ),
  // 2 魔女の大なべ：ぐつぐつ泡が上り、おたまがまわる
  () => (
    <div className="rd-ld-art rd-ld-2">
      <svg className="rd-ld-ladle" viewBox="0 0 30 120" aria-hidden="true"><rect x="12" y="0" width="6" height="104" rx="3" fill="#8A5A3A" /><ellipse cx="15" cy="108" rx="13" ry="9" fill="#6A4430" /></svg>
      {[[70, 14, 0], [110, 10, .5], [140, 16, .9], [92, 8, 1.3]].map(([x, s, d]) => (
        <span key={x} className="rd-ld-bub" style={{ '--x': x + 'px', '--s': s + 'px', '--d': d + 's' }} />
      ))}
      <svg className="rd-ld-pot" viewBox="0 0 220 150" aria-hidden="true">
        <g className="rd-ld-brew"><ellipse cx="110" cy="46" rx="92" ry="16" fill="#7FC24A" /><circle cx="76" cy="40" r="7" fill="#9BE15D" /><circle cx="140" cy="44" r="9" fill="#9BE15D" /></g>
        <path d="M14 46 Q110 70 206 46 L196 110 Q180 146 110 146 Q40 146 24 110 Z" fill="#241A2B" />
        <path d="M6 44 Q110 66 214 44 L214 54 Q110 78 6 54 Z" fill="#33263D" />
        <path d="M40 140 L30 150 M180 140 L190 150" stroke="#241A2B" strokeWidth="8" strokeLinecap="round" />
        <path d="M60 90 Q66 80 76 88" stroke="#4A3A55" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  ),
  // 3 月をまわるこうもり
  () => (
    <div className="rd-ld-art rd-ld-3">
      <svg className="rd-ld-moon" viewBox="0 0 92 92" aria-hidden="true">
        <path d="M30 4 L62 2 L86 22 L90 54 L74 82 L42 90 L14 76 L2 46 L10 18 Z" fill="#F6E7C8" />
        <path d="M28 30 L38 26 L42 36 L34 42 Z M56 54 L68 52 L70 64 L58 66 Z M50 20 L56 18 L58 24 L52 26 Z" fill="#E2CFA8" />
      </svg>
      <div className="rd-ld-orbit"><span className="rd-ld-bat"><Bat /></span></div>
      <div className="rd-ld-orbit rd-ld-orbit--2"><span className="rd-ld-bat"><Bat /></span></div>
    </div>
  ),
  // 4 おばけのいないいないばあ：お墓のうしろからのぞいて、まばたきして、もぐる
  () => (
    <div className="rd-ld-art rd-ld-4">
      <svg className="rd-ld-ghost" viewBox="0 0 80 100" aria-hidden="true">
        <path d="M40 6 L64 18 L72 46 L74 92 L60 84 L50 94 L40 84 L28 94 L18 84 L6 92 L8 46 L16 18 Z" fill="#F6E7C8" />
        <path className="rd-ld-eye" d="M26 38 L34 36 L32 50 L24 50 Z" fill="#3B2340" />
        <path className="rd-ld-eye" d="M48 36 L56 38 L56 50 L48 50 Z" fill="#3B2340" />
        <path d="M34 60 L46 60 L44 68 L36 68 Z" fill="#3B2340" />
        <ellipse cx="20" cy="56" rx="5" ry="3" fill="#F2B8C6" opacity=".8" /><ellipse cx="60" cy="56" rx="5" ry="3" fill="#F2B8C6" opacity=".8" />
      </svg>
      <svg className="rd-ld-grave" viewBox="0 0 160 120" aria-hidden="true">
        <path d="M30 120 L30 46 Q30 8 80 8 Q130 8 130 46 L130 120 Z" fill="#6A5A78" />
        <path d="M38 120 L38 48 Q38 18 80 18" stroke="#7E6E8C" strokeWidth="4" fill="none" />
        <path d="M62 52 L98 52 M80 38 L80 76" stroke="#4A3A58" strokeWidth="7" strokeLinecap="round" />
        <path d="M0 120 Q40 100 80 112 Q120 100 160 120 Z" fill="#241A2B" />
      </svg>
    </div>
  ),
  // 5 クモの糸：巣から糸をのばして、びよーんと下りては上る
  () => (
    <div className="rd-ld-art rd-ld-5">
      <svg className="rd-ld-fill rd-ld-web" viewBox="0 0 220 220" aria-hidden="true">
        <g stroke="#F6E7C8" strokeWidth="1.4" fill="none">
          <path d="M0 0 L110 110 M110 0 L110 110 M220 0 L110 110 M0 70 L110 110 M220 70 L110 110" />
          <path d="M40 40 Q75 30 110 36 Q145 30 180 40 M70 70 Q90 62 110 66 Q130 62 150 70" />
        </g>
      </svg>
      <div className="rd-ld-spider">
        <span className="rd-ld-thread" />
        <svg className="rd-ld-spbody" viewBox="0 0 40 40" aria-hidden="true">
          <g stroke="#F6E7C8" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M16 18 L6 10 L2 16 M16 21 L4 20 L1 27 M17 24 L7 30 L6 37 M18 26 L12 34" />
            <path d="M24 18 L34 10 L38 16 M24 21 L36 20 L39 27 M23 24 L33 30 L34 37 M22 26 L28 34" />
          </g>
          <ellipse cx="20" cy="22" rx="7" ry="8" fill="#241A2B" stroke="#F6E7C8" strokeWidth="1.5" />
          <circle cx="20" cy="12" r="5" fill="#241A2B" stroke="#F6E7C8" strokeWidth="1.5" />
          <circle cx="18" cy="11" r="1.3" fill="#F4C451" /><circle cx="22" cy="11" r="1.3" fill="#F4C451" />
        </svg>
      </div>
    </div>
  ),
  // 6 ビンゴにスタンプ：9マスに順にかぼちゃのハンコが押され、そろったら消えてくり返す
  () => (
    <div className="rd-ld-art rd-ld-6">
      <div className="rd-ld-grid">
        {[0, 4, 8, 2, 6, 1, 7, 3, 5].map((order, i) => (
          <span key={i} className="rd-ld-cell" style={{ '--i': order }}><Pumpkin /></span>
        ))}
      </div>
    </div>
  ),
];

// 直前に出した番号（同じものが続かないように）
let lastArt = -1;
function pickArt() {
  let n = Math.floor(Math.random() * ARTS.length);
  if (n === lastArt) n = (n + 1 + Math.floor(Math.random() * (ARTS.length - 1))) % ARTS.length;
  lastArt = n;
  return n;
}

export default function Loader({ size = 'inline' }) {
  // 出たときに1回だけ選ぶ（描き直しのたびに変わらないように）
  const [n] = useState(pickArt);
  const Art = ARTS[n];
  return (
    <div className={`rd-ld rd-ld--${size}`} role="status">
      <Art />
      <p className="rd-ld-word" aria-label="読み込み中">
        {['よ', 'み', 'こ', 'み', '中', '…'].map((c, i) => <span key={i} style={{ '--i': i }} aria-hidden="true">{c}</span>)}
      </p>
    </div>
  );
}
