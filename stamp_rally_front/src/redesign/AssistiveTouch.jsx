import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, MenuPumpkin } from './parts.jsx';

// どの画面にも出るかぼちゃのメニュー（AssistiveTouch）。構成 v1 の白丸を redesign 用にしたもの。
// 押すとかぼちゃの口が開き、口の中から画面へのボタンが飛び出す。
// タップで4画面へのボタンが扇形に開く。長押しして動かすと、四隅のいちばん近い角に吸いつく。
// 白丸とメニューはいつもいちばん上に重なり、白丸の位置で画面の中身をずらさない。

const ITEMS = [
  { key: 'bingo', label: 'ビンゴ' },
  { key: 'scan', label: '読込' },
  { key: 'prize', label: '景品' },
  { key: 'manual', label: '説明' },
];
// 角ごとの開く向き（度）。0 が右、90 が下。どの角でも画面の内側へ開く
const ANGLES = { bl: [270, 300, 330, 360], br: [270, 240, 210, 180], tl: [90, 60, 30, 0], tr: [90, 120, 150, 180] };
// 30度おきに直径62pxのボタンを並べても、影まで重ならない半径（中心どうしの間隔 2 × 140 × sin15° ≒ 72px）
const RADIUS = 140;
const HOLD_MS = 350;
const CORNER_KEY = 'rd.atCorner';
const TIP_KEY = 'rd.atTipSeen';
const REDUCED = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readLS(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeLS(key, v) { try { localStorage.setItem(key, v); } catch { /* 保存できなくても動く */ } }

// 隠しミニゲーム：かぼちゃを SECRET_TAPS 回続けて押す（押す間隔が SECRET_GAP_MS 以内）と onSecret を呼ぶ
const SECRET_TAPS = 10;
const SECRET_GAP_MS = 700;

export default function AssistiveTouch({ page, onGo, hideTip, onSecret }) {
  const taps = useRef({ n: 0, at: 0 });
  const [corner, setCorner] = useState(() => (['tl', 'tr', 'bl', 'br'].includes(readLS(CORNER_KEY)) ? readLS(CORNER_KEY) : 'bl'));
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(() => readLS(TIP_KEY) !== '1');
  const [drag, setDrag] = useState(null); // 動かしている間のずれ {x, y}
  const btn = useRef(null);
  const wrap = useRef(null);
  const firstItem = useRef(null);
  const press = useRef(null);
  const dropFrom = useRef(null); // 指をはなしたときの白丸の位置。ここから新しい角へすべらせる

  // 角が変わったら、指をはなした位置から新しい角まで動かす（いきなり角へ飛ばない）
  useLayoutEffect(() => {
    const from = dropFrom.current;
    dropFrom.current = null;
    if (!from || !wrap.current) return;
    const to = wrap.current.getBoundingClientRect();
    const dx = from.left - to.left, dy = from.top - to.top;
    if (REDUCED || (Math.abs(dx) < 1 && Math.abs(dy) < 1)) return;
    wrap.current.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 220, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }, [corner, drag]);

  function close(focusButton) {
    setOpen(false);
    if (focusButton) btn.current?.focus();
  }
  function toggle() {
    // 続けて押した回数を数え、10回目でメニューを閉じて隠しミニゲームを出す
    const now = Date.now();
    const t = taps.current;
    t.n = now - t.at <= SECRET_GAP_MS ? t.n + 1 : 1;
    t.at = now;
    if (t.n >= SECRET_TAPS && onSecret) {
      t.n = 0;
      setOpen(false);
      onSecret();
      return;
    }
    setOpen((v) => !v);
    if (tip) { setTip(false); writeLS(TIP_KEY, '1'); }
  }

  useEffect(() => {
    if (open) firstItem.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function onPointerDown(e) {
    const p = { x: e.clientX, y: e.clientY, moved: false, dragging: false };
    p.timer = setTimeout(() => { p.dragging = true; setOpen(false); setDrag({ x: 0, y: 0 }); }, HOLD_MS);
    press.current = p;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > 6) p.moved = true;
    if (p.dragging) setDrag({ x: dx, y: dy });
  }
  function onPointerUp(e) {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.dragging) {
      // 指をはなした位置にいちばん近い角へ
      const frame = btn.current.closest('.rd-frame').getBoundingClientRect();
      const next = (e.clientY - frame.top > frame.height / 2 ? 'b' : 't') + (e.clientX - frame.left > frame.width / 2 ? 'r' : 'l');
      dropFrom.current = wrap.current.getBoundingClientRect();
      setCorner(next);
      writeLS(CORNER_KEY, next);
      setDrag(null);
    } else if (!p.moved) {
      toggle();
    }
  }
  function onPointerCancel() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    setDrag(null);
  }

  return (
    <>
      {open && <div className="rd-dim" onClick={() => close(false)} aria-hidden="true" />}
      <div ref={wrap} className={`rd-at rd-at--${corner}${drag ? ' is-drag' : ''}`} style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}>
        {tip && !hideTip && !open && !drag && <p className="rd-at-tip">かぼちゃを押すと画面を移動できます</p>}
        <nav id="rd-at-menu" aria-label="画面メニュー" hidden={!open}>
          {ITEMS.map((it, i) => {
            const a = (ANGLES[corner][i] * Math.PI) / 180;
            const here = it.key === page;
            return (
              <button
                key={it.key}
                ref={i === 0 ? firstItem : undefined}
                type="button"
                className="rd-at-item"
                // --fx, --fy: かぼちゃの口からの距離。ここから飛び出してくるように見せる
                style={{ left: 28 + Math.cos(a) * RADIUS - 31, top: 28 + Math.sin(a) * RADIUS - 31, '--fx': -Math.cos(a) * RADIUS + 'px', '--fy': -Math.sin(a) * RADIUS + 'px', '--i': i }}
                aria-current={here ? 'page' : undefined}
                onClick={() => { close(false); if (!here) onGo(it.key); }}
              >
                <Icon name={it.key} />{it.label}
              </button>
            );
          })}
        </nav>
        <button
          ref={btn}
          type="button"
          className="rd-at-btn"
          aria-label="画面メニュー"
          aria-expanded={open}
          aria-controls="rd-at-menu"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={(e) => { if (e.detail === 0) toggle(); }}
        >
          <MenuPumpkin />
        </button>
      </div>
    </>
  );
}
