import { useEffect, useRef, useState } from 'react';

// 隠しミニゲーム「魔女のほうき」。かぼちゃのメニューを10回続けて押すと出てくる。
// タップで魔女がふわっと上がり、こうもりの群れのすき間をくぐった数を競う。
// スマホの中だけで動き、サーバーとは通信しない（最高記録もこの端末にだけ保存する）。
// ふだんは読み込まず、見つけたときに初めて読み込む（RedesignApp.jsx で lazy 読み込み）。

const BEST_KEY = 'rd.witchBest';
function readBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } }
function writeBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* 保存できなくても遊べる */ } }
const rand = (a, b) => a + Math.random() * (b - a);

// 絵（キャンバスに描く切り絵）
function drawBg(c, W, H) {
  c.fillStyle = '#3B2340'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#4A2E50';
  c.beginPath(); c.moveTo(0, H * .25); c.lineTo(W * .35, H * .2); c.lineTo(W, H * .27); c.lineTo(W, H * .75); c.lineTo(W * .6, H * .8); c.lineTo(0, H * .76); c.closePath(); c.fill();
}
function drawBat(c, x, y, s, t) {
  const f = Math.sin(t / 60) * .5 + .5;
  c.save(); c.translate(x, y); c.fillStyle = '#241A2B';
  c.beginPath(); c.moveTo(0, -s * .05);
  c.quadraticCurveTo(-s * .3, -s * .45 * f - s * .05, -s * .95, -s * .25 * f); c.quadraticCurveTo(-s * .55, -s * .05, -s * .55, s * .2); c.quadraticCurveTo(-s * .3, s * .05, 0, s * .2);
  c.quadraticCurveTo(s * .3, s * .05, s * .55, s * .2); c.quadraticCurveTo(s * .55, -s * .05, s * .95, -s * .25 * f); c.quadraticCurveTo(s * .3, -s * .45 * f - s * .05, 0, -s * .05);
  c.fill();
  c.beginPath(); c.ellipse(0, s * .05, s * .17, s * .22, 0, 0, 7); c.fill();
  c.fillStyle = '#F4C451'; c.beginPath(); c.arc(-s * .06, 0, s * .035, 0, 7); c.arc(s * .06, 0, s * .035, 0, 7); c.fill();
  c.restore();
}
function drawWitch(c, x, y, s, tilt) {
  c.save(); c.translate(x, y); c.rotate(tilt); c.scale(s / 120, s / 120); c.translate(-60, -24);
  c.strokeStyle = '#8A5A3A'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(18, 38); c.lineTo(112, 28); c.stroke();
  c.fillStyle = '#C9AE84'; c.beginPath(); c.moveTo(22, 36); c.lineTo(0, 24); c.lineTo(4, 38); c.lineTo(0, 52); c.closePath(); c.fill();
  c.fillStyle = '#6A3B8A'; c.beginPath(); c.moveTo(52, 34); c.lineTo(66, 6); c.lineTo(84, 32); c.closePath(); c.fill();
  c.fillStyle = '#F6E7C8'; c.beginPath(); c.arc(70, 6, 6, 0, 7); c.fill();
  c.fillStyle = '#241A2B'; c.beginPath(); c.moveTo(60, 4); c.lineTo(74, -14); c.lineTo(80, 4); c.closePath(); c.fill(); c.fillRect(56, 2, 30, 4);
  c.restore();
}

// 動きの決まり（キャンバスの幅を600としたときの値）
const W = 600;
const GAP = 320;       // こうもりの群れのすき間の高さ
const X = 160;         // 魔女の横位置
const SPEED = .26;     // 横に流れる速さ
const GRAVITY = .0021;
const FLAP = -.78;     // タップしたときに上がる勢い

export default function WitchGame({ onBack }) {
  const canvasRef = useRef(null);
  const g = useRef(null);          // ゲームの状態（描き直しをさせないよう ref に持つ）
  const [phase, setPhase] = useState('ready'); // ready → play → over
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(readBest);

  useEffect(() => {
    const cv = canvasRef.current;
    const c = cv.getContext('2d');
    let H = 1000, raf = 0, last = 0;
    // 画面の縦横比に合わせて、キャンバスの高さを決める（幅はいつも600）
    const fit = () => { H = Math.round(W * cv.clientHeight / Math.max(1, cv.clientWidth)); cv.width = W; cv.height = H; };
    fit();
    window.addEventListener('resize', fit);
    g.current = { y: H / 2, vy: 0, walls: [], spawn: 0, score: 0, running: false, H: () => H };

    const end = () => {
      const s = g.current;
      if (!s.running) return;
      s.running = false;
      const b = Math.max(readBest(), s.score);
      writeBest(b);
      setBestScore(b);
      setPhase('over');
    };
    const frame = (t) => {
      const dt = Math.min(40, t - (last || t)); last = t;
      const s = g.current;
      drawBg(c, W, H);
      if (s.running) {
        s.vy += GRAVITY * dt; s.y += s.vy * dt;
        s.spawn -= SPEED * dt;
        if (s.spawn <= 0) { s.walls.push({ x: W + 60, gy: rand(220, H - 220), passed: false }); s.spawn = 330; }
        for (const w of s.walls) {
          w.x -= SPEED * dt;
          if (!w.passed && w.x < X) { w.passed = true; s.score++; setScore(s.score); }
          if (Math.abs(w.x - X) < 55 && Math.abs(s.y - w.gy) > GAP / 2 - 30) end();
        }
        s.walls = s.walls.filter((w) => w.x > -80);
        if (s.y < 20 || s.y > H - 20) end();
      }
      for (const w of s.walls) {
        for (let by = w.gy - GAP / 2 - 30; by > -40; by -= 66) drawBat(c, w.x + Math.sin((by + t) / 200) * 6, by, 70, t + by);
        for (let by = w.gy + GAP / 2 + 30; by < H + 40; by += 66) drawBat(c, w.x + Math.sin((by + t) / 200) * 6, by, 70, t + by);
      }
      drawWitch(c, X, s.y, 120, Math.max(-.4, Math.min(.5, s.vy * .9)));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); };
  }, []);

  const start = () => {
    const s = g.current;
    s.y = s.H() / 2; s.vy = -.5; s.walls = []; s.spawn = 200; s.score = 0; s.running = true;
    setScore(0);
    setPhase('play');
  };
  const flap = () => { if (g.current?.running) g.current.vy = FLAP; };

  return (
    <div className="rd-wg" role="dialog" aria-modal="true" aria-label="魔女のほうき">
      <canvas ref={canvasRef} className="rd-wg-canvas" onPointerDown={flap} aria-label="魔女のほうきのゲーム画面" />
      <div className="rd-wg-hud" aria-hidden={phase !== 'play'}>
        <span>くぐった数 <b>{score}</b></span>
        <span>さいこう <b>{bestScore}</b></span>
      </div>
      {phase !== 'play' && (
        <div className="rd-wg-cover">
          {phase === 'ready' ? (
            <>
              <p className="rd-wg-secret">ひみつのゲームを見つけた！</p>
              <h2>魔女のほうき</h2>
              <p>画面をタップすると魔女がふわっと上がります。こうもりの群れのすき間をくぐろう</p>
              <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={start}>はじめる</button>
            </>
          ) : (
            <>
              <h2>{score}こ くぐった！</h2>
              <p>さいこう記録 {bestScore}こ</p>
              <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={start}>もう一回</button>
            </>
          )}
          <button type="button" className="rd-btn" onClick={onBack}>ビンゴに戻る</button>
        </div>
      )}
    </div>
  );
}
