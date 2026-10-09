import { useEffect, useRef } from 'react';

// 背景で動くハロウィンの登場もの（星・月と雲・魔女・こうもり・おばけ・黒猫）。見た目だけで、操作はできない。
// 星・月・雲はずっと置いておき、ほかはときどき出して、動き終わったら消す。
// 黒猫だけは画面の中身より手前（front）に出す。動きを減らす設定の端末では、星と月だけを止めて置く。
// catchable のとき（説明画面）は、黒猫をつかんで上に引っぱれる。十分引っぱると onCatch を呼ぶ（開発者紹介へ）。

const REDUCED = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

const SVG = {
  star: '<svg viewBox="0 0 20 20"><path d="M10 0 L12.5 7.5 L20 10 L12.5 12.5 L10 20 L7.5 12.5 L0 10 L7.5 7.5 Z" fill="#F4C451"/></svg>',
  moon: '<svg viewBox="0 0 92 92"><path d="M30 4 L62 2 L86 22 L90 54 L74 82 L42 90 L14 76 L2 46 L10 18 Z" fill="#F6E7C8"/><path d="M28 30 L38 26 L42 36 L34 42 Z M56 54 L68 52 L70 64 L58 66 Z M50 20 L56 18 L58 24 L52 26 Z" fill="#E2CFA8"/></svg>',
  witch: '<svg viewBox="0 -14 120 70"><path d="M18 38 L112 28" stroke="#241A2B" stroke-width="4" stroke-linecap="round"/><path d="M22 36 L0 24 L4 38 L0 52 Z" fill="#241A2B"/><path d="M52 34 L66 6 L84 32 Z" fill="#241A2B"/><path d="M56 30 L34 22 L42 36 Z" fill="#241A2B"/><circle cx="70" cy="6" r="6" fill="#241A2B"/><path d="M60 4 L74 -14 L80 4 Z" fill="#241A2B"/><path d="M56 4 Q70 0 86 4 L84 7 Q70 4 58 7 Z" fill="#241A2B"/><path d="M72 32 L82 44 L76 44 Z" fill="#241A2B"/></svg>',
  bat: '<svg viewBox="0 0 60 30"><g class="rd-hx-wing"><path d="M30 14 Q20 1 1 5 Q8 10 6 17 Q14 12 18 19 Q22 12 30 17 Z M30 14 Q40 1 59 5 Q52 10 54 17 Q46 12 42 19 Q38 12 30 17 Z" fill="#241A2B"/></g><ellipse cx="30" cy="16" rx="5" ry="6.5" fill="#241A2B"/><path d="M26 12 L26.5 6 L29 10 Z M34 12 L33.5 6 L31 10 Z" fill="#241A2B"/><circle cx="28" cy="15" r="1" fill="#F4C451"/><circle cx="32" cy="15" r="1" fill="#F4C451"/></svg>',
  ghost: '<svg viewBox="0 0 80 100"><path d="M40 6 L64 18 L72 46 L74 92 L60 84 L50 94 L40 84 L28 94 L18 84 L6 92 L8 46 L16 18 Z" fill="#F6E7C8"/><g class="rd-hx-look"><path d="M26 38 L34 36 L32 50 L24 50 Z" fill="#3B2340"/><path d="M48 36 L56 38 L56 50 L48 50 Z" fill="#3B2340"/></g><path d="M34 60 L46 60 L44 68 L36 68 Z" fill="#3B2340"/><ellipse cx="20" cy="56" rx="5" ry="3" fill="#F2B8C6" opacity=".8"/><ellipse cx="60" cy="56" rx="5" ry="3" fill="#F2B8C6" opacity=".8"/></svg>',
  // 黒猫は全身を描く。ふだんは頭だけ画面の下からのぞき、つかんで引っぱり出すと、垂れた手足としっぽまで見える
  cat: '<svg viewBox="0 0 120 210"><path class="rd-hx-tail" d="M90 176 Q118 186 112 150 Q108 130 116 116" stroke="#241A2B" stroke-width="9" stroke-linecap="round" fill="none"/><g class="rd-hx-legs"><path d="M34 168 L46 170 L46 202 Q40 210 32 203 Z M74 170 L86 168 L88 203 Q80 210 74 202 Z" fill="#241A2B"/></g><path d="M24 88 Q14 140 28 178 Q60 192 92 178 Q106 140 96 88 Z" fill="#241A2B"/><g class="rd-hx-arms"><path d="M30 104 L40 104 L42 156 Q35 163 28 156 Z M80 104 L90 104 L92 156 Q85 163 78 156 Z" fill="#241A2B"/></g><path d="M10 92 Q8 70 10 46 L2 12 L28 30 Q50 22 72 30 L98 12 L90 46 Q92 70 90 92 Q50 104 10 92 Z" fill="#241A2B"/><ellipse class="rd-hx-lid" cx="34" cy="54" rx="9" ry="10" fill="#F4C451"/><ellipse class="rd-hx-lid" cx="66" cy="54" rx="9" ry="10" fill="#F4C451"/><path d="M34 46 L36 54 L34 62 L32 54 Z M66 46 L68 54 L66 62 L64 54 Z" fill="#241A2B"/><path d="M46 68 L54 68 L50 73 Z" fill="#F2B8C6"/><path d="M14 66 L36 70 M14 74 L36 74 M86 66 L64 70 M86 74 L64 74" stroke="#5A3E66" stroke-width="1.5"/></svg>',
};

// 1つ置く。life(ms) を渡すと、そのあと消す
function put(layer, cls, html, vars, life) {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  for (const k in vars) d.style.setProperty(k, vars[k]);
  layer.appendChild(d);
  if (life) d.removeTimer = setTimeout(() => d.remove(), life);
  return d;
}

// 黒猫を上に引っぱったと見なす距離(px)
const CATCH_PULL = 110;

export default function Haunt({ catchable = false, onCatch }) {
  const back = useRef(null);
  const front = useRef(null);
  // effect は1回しか走らないので、最新の値は ref から読む
  const catchableRef = useRef(catchable);
  const onCatchRef = useRef(onCatch);
  const spawnCatRef = useRef(null);
  useEffect(() => { catchableRef.current = catchable; onCatchRef.current = onCatch; });
  // 説明画面に入ったら、少しして黒猫を出す（見つけてもらいやすいように）
  useEffect(() => {
    if (!catchable) return undefined;
    const t = setTimeout(() => spawnCatRef.current?.(), 1500);
    return () => clearTimeout(t);
  }, [catchable]);

  useEffect(() => {
    const B = back.current, F = front.current;
    const W = () => B.clientWidth;

    // ずっと置いておくもの：星・月・雲
    for (let i = 0; i < 14; i++) put(B, 'rd-hx-star', SVG.star, { left: rand(2, 96) + '%', top: rand(2, 92) + '%', '--s': rand(7, 15) + 'px', '--d': rand(1.8, 3.6) + 's', '--dl': -rand(0, 3) + 's' });
    put(B, 'rd-hx-moon', SVG.moon, {});
    for (let i = 0; i < 3; i++) put(B, 'rd-hx-cloud', '', { bottom: rand(90, 210) + 'px', width: rand(90, 150) + 'px', '--d': rand(26, 40) + 's', '--dl': -rand(0, 30) + 's' });
    // 片付け（StrictMode では effect が2回走るので、置いたものも消す）
    const timers = new Set();
    const cleanup = () => {
      timers.forEach(clearTimeout);
      B.replaceChildren();
      F.replaceChildren();
    };
    if (REDUCED) return cleanup;

    // 黒猫を出す。つかめるときは、つかんで上に引っぱれる
    const spawnCat = () => {
      if (F.querySelector('.rd-hx-cat')) return; // 1匹ずつ
      const d = put(F, 'rd-hx-cat', SVG.cat, { right: rand(10, 120) + 'px' }, 6200);
      if (!catchableRef.current) return;
      d.classList.add('is-catchable');
      let hold = null;
      d.addEventListener('pointerdown', (e) => {
        if (!catchableRef.current) return;
        e.preventDefault();
        d.setPointerCapture(e.pointerId);
        clearTimeout(d.removeTimer);
        // 今の位置で止めて、指について動かす
        const base = new DOMMatrix(getComputedStyle(d).transform).m42;
        d.style.animation = 'none';
        d.style.transform = `translateY(${base}px)`;
        d.classList.add('is-held');
        hold = { y: e.clientY, base };
      });
      d.addEventListener('pointermove', (e) => {
        if (!hold) return;
        const dy = Math.min(0, e.clientY - hold.y); // 上方向だけ
        d.style.transform = `translateY(${hold.base + dy}px)`;
      });
      const release = (e) => {
        if (!hold) return;
        const pulled = hold.y - e.clientY >= CATCH_PULL;
        hold = null;
        d.classList.remove('is-held');
        d.classList.add(pulled ? 'is-caught' : 'is-dropped');
        setTimeout(() => d.remove(), 500);
        if (pulled) onCatchRef.current?.();
      };
      d.addEventListener('pointerup', release);
      d.addEventListener('pointercancel', release);
    };
    spawnCatRef.current = spawnCat;

    // ときどき出すもの。every: 次が出るまでの目安(ms)
    const spawners = [
      { every: 5200, spawn: () => put(B, 'rd-hx-shoot', '', { left: rand(50, 95) + '%', top: rand(2, 30) + '%' }, 1200) },
      { every: 9000, spawn: () => { const y = B.clientHeight - rand(170, 230); put(B, 'rd-hx-witch', SVG.witch, { '--d': rand(5, 7) + 's', '--y0': y + 40 + 'px', '--y1': y + 'px', '--y2': y - 30 + 'px', '--x1': W() + 20 + 'px' }, 8000); } },
      { every: 2600, spawn: () => {
        const n = Math.round(rand(1, 3.4)), ltr = Math.random() < .5, y = rand(40, B.clientHeight - 200);
        for (let i = 0; i < n; i++) {
          const dy = rand(-40, 40);
          setTimeout(() => put(B, 'rd-hx-bat', '<div>' + SVG.bat + '</div>', { '--w': rand(28, 50) + 'px', '--d': rand(4.5, 7) + 's', '--wd': rand(1, 1.8) + 's', '--dir': ltr ? 1 : -1, '--x0': (ltr ? -70 : W() + 20) + 'px', '--x1': (ltr ? W() + 20 : -70) + 'px', '--y0': y + dy + 'px', '--y1': y + dy + rand(-120, 60) + 'px' }, 8000), i * rand(150, 400));
        }
      } },
      { every: 3200, spawn: () => { const x = rand(-10, W() - 60), y = rand(60, B.clientHeight - 140); put(B, 'rd-hx-ghost', '<div>' + SVG.ghost + '</div>', { '--w': rand(40, 64) + 'px', '--d': rand(7, 10) + 's', '--x0': x + 'px', '--y0': y + 'px', '--x1': x + rand(-60, 60) + 'px', '--y1': y - rand(40, 120) + 'px' }, 10500); } },
      // 黒猫：説明画面ではつかめて、出てくる間隔も短くする
      { every: () => (catchableRef.current ? 6000 : 9000), spawn: () => spawnCat() },
    ];
    const schedule = (s) => {
      const t = setTimeout(() => {
        timers.delete(t);
        // 画面が裏に回っている間は出さない（戻ったときにまとめて出てこないように）
        if (!document.hidden) s.spawn();
        schedule(s);
      }, (typeof s.every === 'function' ? s.every() : s.every) * rand(.6, 1.4));
      timers.add(t);
    };
    spawners.forEach((s) => { s.spawn(); schedule(s); });
    return cleanup;
  }, []);

  return (
    <>
      <div className="rd-hx" ref={back} aria-hidden="true" />
      <div className="rd-hx rd-hx--front" ref={front} aria-hidden="true" />
    </>
  );
}
