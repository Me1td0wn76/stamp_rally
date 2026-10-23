import { useEffect, useMemo, useRef, useState } from 'react';
import { Night } from './parts.jsx';
import SpecialTicket from './SpecialTicket.jsx';
import { timeline, TIMING } from './specialData.js';


const pad4 = (n) => String(n).padStart(4, '0');
const REDUCED = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PUNCH_MS = 750;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
const K = 0.46;
function Drips({ base, drips, fill }) {
  return (
    <g fill={fill}>
      <rect x="0" y="0" width="100" height={base + 0.2} />
      {drips.map(({ x, w, len }) => {
        const neck = w * 0.3, bulb = w * 0.5, r = bulb * K, y = base + len - r, f = w * 0.45;
        return (
          <g key={x}>
            <path d={`M${x - neck - f} ${base}C${x - neck} ${base} ${x - neck} ${base + f * K} ${x - neck} ${base + f * K * 2}L${x - bulb * 0.8} ${y}H${x + bulb * 0.8}L${x + neck} ${base + f * K * 2}C${x + neck} ${base + f * K} ${x + neck} ${base} ${x + neck + f} ${base}Z`} />
            <ellipse cx={x} cy={y} rx={bulb} ry={r * 1.15} />
          </g>
        );
      })}
    </g>
  );
}
const BACK = [{ x: 8, w: 6, len: 15 }, { x: 27, w: 5, len: 25 }, { x: 46, w: 7, len: 12 }, { x: 63, w: 5, len: 29 }, { x: 82, w: 6, len: 17 }, { x: 95, w: 4, len: 10 }];
const FRONT = [{ x: 15, w: 7, len: 21 }, { x: 36, w: 5, len: 11 }, { x: 52, w: 8, len: 31 }, { x: 72, w: 5, len: 15 }, { x: 89, w: 7, len: 23 }];

function Melt() {
  return (
    <div className="rd-sp-melt" aria-hidden="true">
      <svg viewBox="0 0 100 140" preserveAspectRatio="none">
        <Drips base={100} drips={BACK} fill="#C8582A" />
        <Drips base={100} drips={FRONT} fill="#EE7A2B" />
        <g fill="#F4C451" opacity=".55">
          <rect x="21" y="10" width="1.2" height="70" />
          <rect x="58" y="28" width="1.6" height="58" />
          <rect x="84" y="6" width="1" height="40" />
        </g>
      </svg>
    </div>
  );
}
function Gate() {
  return (
    <svg className="rd-sp-gate" viewBox="0 0 150 168" aria-hidden="true">
      <path d="M10 168V58C10 26 40 6 75 6S140 26 140 58V168Z" fill="#C9AE84" />
      <path className="rd-sp-glow" d="M24 168V62C24 38 46 20 75 20S126 38 126 62V168Z" fill="#FBE08A" />
      <g className="rd-sp-leaf rd-sp-leaf--l">
        <path d="M24 168V62C24 38 46 20 75 20V168Z" fill="#9C4416" />
        <path d="M40 168V48M57 168V30" stroke="rgba(36,26,43,.35)" strokeWidth="3" />
        <circle cx="66" cy="104" r="4" fill="#F4C451" />
      </g>
      <g className="rd-sp-leaf rd-sp-leaf--r">
        <path d="M75 20C104 20 126 38 126 62V168H75Z" fill="#9C4416" />
        <path d="M93 168V30M110 168V48" stroke="rgba(36,26,43,.35)" strokeWidth="3" />
        <circle cx="84" cy="104" r="4" fill="#F4C451" />
      </g>
    </svg>
  );
}

function Line({ l }) {
  const style = { '--d': `${l.at}ms`, '--dur': `${Math.max(l.dur, 1)}ms` };
  if (l.kind === 'cmd') {
    return (
      <p className="rd-sp-ln rd-sp-ln--cmd" style={{ ...style, '--n': l.text.length }}>
        <span className="rd-sp-ps">guest:~$ </span><span className="rd-sp-type">{l.text}</span>
      </p>
    );
  }
  if (l.kind === 'pw') {
    return (
      <p className="rd-sp-ln rd-sp-ln--pw" style={{ ...style, '--n': l.dots }}>
        {l.text}<span className="rd-sp-type">{'*'.repeat(l.dots)}</span>
      </p>
    );
  }
  if (l.kind === 'bar') {
    return (
      <p className="rd-sp-ln rd-sp-ln--bar" style={style}>
        <span>{l.text}</span>
        <span className={`rd-sp-meter${l.hot ? ' is-hot' : ''}`}>
          {Array.from({ length: l.fill }, (_, i) => <i key={i} style={{ '--i': i }} />)}
        </span>
      </p>
    );
  }
  return <p className={`rd-sp-ln rd-sp-ln--${l.kind}`} style={style}>{l.text}</p>;
}

export default function SpecialEntry({ no = 1, stamps = 0, staff = '', stampImage = '', commits = 139, date, onEnter, freeze, still = false }) {
  const tl = useMemo(() => timeline({ no: pad4(no), stamps, staff, commits }), [no, stamps, staff, commits]);
  const [skipped, setSkipped] = useState(false);
  const [punching, setPunching] = useState(false);
  const enterRef = useRef(null);
  const start = skipped ? tl.door : (freeze ?? 0);
  const onEnterRef = useRef(onEnter);
  useEffect(() => { onEnterRef.current = onEnter; });
  useEffect(() => {
    if (!punching) return undefined;
    const id = setTimeout(() => onEnterRef.current?.(), PUNCH_MS);
    return () => clearTimeout(id);
  }, [punching]);
  const enter = () => {
    if (punching) return;
    if (REDUCED) onEnter?.();
    else setPunching(true);
  };
  useEffect(() => {
    if (still) return undefined;
    const wait = Math.max(0, tl.door + 1100 - start);
    const id = setTimeout(() => enterRef.current?.focus({ preventScroll: true }), wait);
    return () => clearTimeout(id);
  }, [tl, start, still]);

  const style = { '--freeze': `${start}ms`, '--melt': `${tl.melt}ms`, '--door': `${tl.door}ms`, '--melt-len': `${TIMING.meltLen}ms` };
  return (
    <div className={`rd-sp-entry${still ? ' is-still' : ''}`} role="dialog" aria-modal="true" aria-label="特別室の入り口" style={style}>
      {/* とばしたら作り直して、扉の場面から始める */}
      <div key={skipped ? 'door' : 'all'}>
        <div className="rd-sp-term" aria-hidden="true">
          <div className="rd-sp-bar-top"><i /><i /><i /><span>guest@codeflow — 402</span></div>
          <div className="rd-sp-lines">
            {tl.lines.map((l, i) => <Line key={i} l={l} />)}
          </div>
        </div>
        <Melt />
        <div className="rd-sp-door">
          <Night />
          <p className="rd-sp-sign">402 ・ 特別室</p>
          <Gate />
          <SpecialTicket no={no} date={date ?? today()} stampImage={stampImage} punching={punching} />
          <p className="rd-note">カギを手に入れました。かぼちゃのメニューから、いつでも入れます</p>
          <button ref={enterRef} type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={enter} aria-disabled={punching}>{punching ? 'パチン！' : '特別室に入る'}</button>
        </div>
        {!skipped && <button type="button" className="rd-btn rd-btn--line rd-sp-skip" onClick={() => setSkipped(true)}>とばす ›</button>}
      </div>
    </div>
  );
}
