import { useEffect, useRef, useState } from 'react';
import { Title } from './parts.jsx';
import { MEMBERS, STATS, NIGHT_OWL, HISTORY, GALLERY, ROOM_ITEMS, FORTUNES, HELP, GIT_LOG } from './specialData.js';

// 特別室（隠し画面）。入り口（SpecialEntry.jsx）で入室証をもらった人だけが入れる。
// 部屋の絵に置いてあるものを押すと、それぞれの中身が開く：メンバー（トレカ）・メイキング・ターミナル・記念写真
// 「準備中」のもの（いまの会場・しくみ・金庫）は、あとから中身を足す
//
// no: 入室番号 / cells・lines: ビンゴのマスとそろった列（記念写真に使う。渡さなければ GET /api/bingo から取る）
// stampImage: 入るときに押されたスタッフの印 / onExit: ビンゴに戻る
// view・flipped・avatars・history: 見本用（はじめに開く中身、裏返しておくカード、GitHub のアイコンを出すか、ターミナルの履歴）

const pad4 = (n) => String(n).padStart(4, '0');

// ---------------------------------------------------------------- 部屋の絵
function RoomArt() {
  return (
    <svg className="rd-sp-scene-art" viewBox="0 0 340 290" aria-hidden="true">
      {/* 壁と床 */}
      <path d="M0 0H340V222H0Z" fill="#4A2E50" />
      <g fill="#3B2340" opacity=".55">{[30, 92, 154, 216, 278].map((x) => <path key={x} d={`M${x} 0h5v222h-5Z`} />)}</g>
      <path d="M0 220L60 216L140 222L230 217L340 221V290H0Z" fill="#241A2B" />
      <path d="M0 254L120 249L250 255L340 251" stroke="#3B2340" strokeWidth="3" fill="none" />
      {/* 窓（いまの会場）：夜空と月 */}
      <path d="M14 18L104 14L106 104L16 106Z" fill="#F6E7C8" />
      <path d="M22 24L97 21L98 97L24 99Z" fill="#241A2B" />
      <circle className="rd-sp-moonlit" cx="78" cy="44" r="12" fill="#F6E7C8" />
      <g fill="#F4C451"><path d="M36 36l1.5 3.5L41 41l-3.5 1.5L36 46l-1.5-3.5L31 41l3.5-1.5Z" /><path d="M44 78l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" /></g>
      <path d="M60 22L61 98M23 60L98 58" stroke="#F6E7C8" strokeWidth="4" />
      {/* ポスター（メンバー） */}
      <g transform="rotate(-3 165 63)">
        <path d="M126 16H204V110H126Z" fill="#FFF6E2" />
        <path d="M126 16H204V34H126Z" fill="#EE7A2B" />
        <path d="M136 22h40v6h-40Z" fill="#3B2340" opacity=".7" />
        {[[142, 52, '#EE7A2B'], [165, 52, '#F4C451'], [188, 52, '#F2B8C6'], [142, 80, '#F4C451'], [165, 80, '#C9AE84'], [188, 80, '#EE7A2B']].map(([x, y, c]) => (
          <g key={`${x}${y}`}><circle cx={x} cy={y} r="8.5" fill={c} stroke="#3B2340" strokeWidth="2.5" /><path d={`M${x - 8} ${y + 17}h16`} stroke="#3B2340" strokeWidth="2.5" /></g>
        ))}
        <path d="M120 14l14 4-2 7-14-4Z M196 12l14-2 1 7-14 2Z" fill="#F4C451" opacity=".9" />
      </g>
      {/* 黒板（しくみ） */}
      <path d="M220 22L330 24L328 98L222 96Z" fill="#C9AE84" />
      <path d="M227 29L323 31L321 91L229 89Z" fill="#241A2B" />
      <g fill="none" stroke="#F6E7C8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M240 50h16v14h-16Z M284 50h18v14h-18Z" />
        <path d="M257 57h25M276 53l6 4-6 4" />
        <path d="M246 76l-5 4 5 4M262 72l-6 16M272 76l5 4-5 4" />
      </g>
      {/* 本棚（メイキング）。金色のアルバムが目立つ */}
      <path d="M14 120H100V222H14Z" fill="#C9AE84" />
      <path d="M20 126H94V170H20Z M20 176H94V216H20Z" fill="#9C4416" />
      {[[22, 140, 8, '#F6E7C8'], [31, 134, 9, '#4E6B2A'], [41, 144, 7, '#F2B8C6'], [72, 138, 8, '#F6E7C8'], [81, 132, 10, '#EE7A2B'],
        [22, 186, 9, '#EE7A2B'], [32, 182, 7, '#F6E7C8'], [40, 188, 10, '#4E6B2A'], [51, 184, 8, '#F4C451'], [60, 190, 9, '#F2B8C6'], [70, 186, 8, '#F6E7C8'], [79, 182, 12, '#C8582A']].map(([x, y, w, c]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y}h${w}V${y < 170 ? 170 : 216}h-${w}Z`} fill={c} />
      ))}
      <g transform="rotate(-8 59 148)"><path d="M49 130h22v40H49Z" fill="#F4C451" stroke="#3B2340" strokeWidth="2" /><path d="M54 140h12v6H54Z" fill="#EE7A2B" /></g>
      {/* 本棚の上の黒猫 */}
      <path d="M62 120c-2-10 1-17 4-20l-1-7 5 4c2-1 5-1 7 0l5-4-1 7c3 3 6 10 4 20Z" fill="#241A2B" />
      <path d="M85 118c6 0 10-4 9-10" stroke="#241A2B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="69" cy="106" r="1.6" fill="#F4C451" /><circle cx="77" cy="106" r="1.6" fill="#F4C451" />
      {/* 机 */}
      <path d="M112 178H332V189H112Z" fill="#D9C6A0" />
      <path d="M120 189h8v47h-8Z M318 189h8v47h-8Z" fill="#C9AE84" />
      {/* モニター（ターミナル） */}
      <path d="M188 168h16v10h-16Z M178 176h36v4h-36Z" fill="#120A16" />
      <rect x="148" y="108" width="96" height="62" rx="4" fill="#120A16" />
      <rect x="154" y="114" width="84" height="50" fill="#241A2B" />
      <g fill="#F4C451"><path d="M160 122h5v4h-5Z" /><path d="M168 122h30v4h-30Z" opacity=".7" /></g>
      <g fill="#D9C6A0" opacity=".7"><path d="M164 132h44v3h-44Z M164 140h30v3h-30Z" /></g>
      <path d="M160 150h5v4h-5Z" fill="#F4C451" /><path className="rd-sp-cursor" d="M168 149h6v7h-6Z" fill="#F6E7C8" />
      {/* マグカップ（Java） */}
      <path d="M124 162h16v16h-16Z" fill="#F6E7C8" /><path d="M140 165c6 0 6 9 0 9" stroke="#F6E7C8" strokeWidth="2.5" fill="none" />
      <path className="rd-sp-steam" d="M128 158c-2-3 2-5 0-8M135 158c-2-3 2-5 0-8" stroke="#D9C6A0" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* カメラ（記念写真） */}
      <path d="M264 156l3-5h12l3 5Z" fill="#120A16" />
      <rect x="252" y="155" width="46" height="23" rx="4" fill="#120A16" />
      <circle cx="275" cy="166" r="8.5" fill="#F6E7C8" /><circle cx="275" cy="166" r="5" fill="#EE7A2B" /><circle cx="273" cy="164" r="1.6" fill="#FFF6E2" />
      <path d="M289 158h5v3h-5Z" fill="#F4C451" />
      {/* 金庫 */}
      <path d="M260 196H316V236H260Z" fill="#3B2340" />
      <path d="M265 201H311V231H265Z" fill="#241A2B" />
      <circle cx="288" cy="216" r="7" fill="none" stroke="#F4C451" strokeWidth="2.5" /><path d="M288 209v4M295 216h-4" stroke="#F4C451" strokeWidth="2" />
      {/* 床のかぼちゃ */}
      <g transform="translate(150 236) scale(.5)">
        <path d="M8 30 L22 10 L58 10 L72 30 L70 58 L52 68 L28 68 L10 58 Z" fill="#EE7A2B" />
        <path d="M30 10 Q24 40 30 68 L34 68 Q28 40 34 10 Z M46 10 Q52 40 46 68 L50 68 Q56 40 50 10 Z" fill="#C8582A" />
        <path d="M36 10 L38 0 L46 2 L42 10 Z" fill="#4E6B2A" />
        <path d="M20 34 L28 22 L34 36 Z M46 36 L52 22 L60 34 Z M22 46 L30 52 L36 46 L42 54 L50 46 L58 50 L52 58 L28 58 Z" fill="#3B2340" />
      </g>
    </svg>
  );
}

// 絵の上の押せる場所（viewBox の座標）
const HOT = {
  members: [124, 12, 86, 104], making: [14, 118, 88, 106], term: [146, 106, 100, 76], photo: [248, 148, 60, 34],
  live: [14, 14, 94, 94], how: [218, 20, 112, 80], safe: [256, 192, 64, 46],
};

function Room({ no, open }) {
  return (
    <>
      <Title name="特別室" sub={`No.${pad4(no)}`} />
      <p className="rd-msg">CodeFlow の教室の、さらに奥。気になるものを押してみてください。</p>
      <div className="rd-sp-scene">
        <RoomArt />
        <div className="rd-sp-hots" style={{ position: 'absolute', inset: 8 }}>
          {ROOM_ITEMS.map((it) => {
            const [x, y, w, h] = HOT[it.key];
            return (
              <button key={it.key} type="button" className={`rd-sp-hot${it.ready ? ' is-new' : ''}`} disabled={!it.ready}
                style={{ left: `${(x / 340) * 100}%`, top: `${(y / 290) * 100}%`, width: `${(w / 340) * 100}%`, height: `${(h / 290) * 100}%` }}
                onClick={() => open(it.key)} aria-label={it.ready ? it.label : `${it.label}（準備中）`}>
                <span className="rd-sp-tag" aria-hidden="true">{it.ready ? it.label : '準備中'}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rd-sp-menu">
        {ROOM_ITEMS.filter((it) => it.ready).map((it) => (
          <button key={it.key} type="button" className="rd-btn" onClick={() => open(it.key)}>{it.label}</button>
        ))}
        {ROOM_ITEMS.filter((it) => !it.ready).map((it) => (
          <button key={it.key} type="button" className="rd-btn rd-btn--soon" disabled>{it.label}</button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- メンバー（トレカ）
function Avatar({ name, show }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="rd-sp-ava" aria-hidden="true">
      {name[0].toUpperCase()}
      {show && !broken && <img src={`https://github.com/${name}.png?size=128`} alt="" loading="lazy" onError={() => setBroken(true)} />}
    </span>
  );
}

function Members({ back, flipped: first, avatars }) {
  const [flipped, setFlipped] = useState(() => new Set(first ? [first] : []));
  const max = Math.max(...MEMBERS.map((m) => m.commits));
  const toggle = (name) => setFlipped((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  return (
    <>
      <Title name="メンバー" sub={`${MEMBERS.length}人`} back={back} />
      <p className="rd-note">カードを押すと裏返ります</p>
      <ul className="rd-sp-cards">
        {MEMBERS.map((m, idx) => (
          <li key={m.name}>
            <button type="button" className={`rd-sp-card${flipped.has(m.name) ? ' is-flipped' : ''}`} aria-pressed={flipped.has(m.name)} onClick={() => toggle(m.name)}
              aria-label={`${m.name}。${m.parts.join('、')}`}>
              <span className="rd-sp-card-in">
                <span className="rd-sp-face">
                  <span className="rd-sp-no">#{String(idx + 1).padStart(2, '0')}</span>
                  {m.stamp && <img className="rd-sp-mark" src={`/stamps/${m.stamp}`} alt="" />}
                  <Avatar name={m.name} show={avatars} />
                  <h2>{m.name}</h2>
                  <span className="rd-sp-role">{m.parts[0]}</span>
                  <span className="rd-sp-commits" style={{ '--w': `${Math.round((m.commits / max) * 100)}%` }}>コミット<b>{m.commits}</b><i /></span>
                </span>
                <span className="rd-sp-face rd-sp-face--back">
                  <h2>{m.name}</h2>
                  <ul>{m.parts.map((p) => <li key={p}>{p}</li>)}</ul>
                  <dl className="rd-sp-back-dl">
                    <dt>ひとこと</dt><dd className={m.word ? 'rd-sp-word' : 'is-empty'}>{m.word || '準備中'}</dd>
                    <dt>好きな言語</dt><dd className={m.lang ? '' : 'is-empty'}>{m.lang || '準備中'}</dd>
                    <dt>はじめて</dt><dd>{m.first.replaceAll('-', '.')}</dd>
                    <dt>コミット</dt><dd>{m.commits} 回</dd>
                  </dl>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- メイキング
function Making({ back }) {
  return (
    <>
      <Title name="メイキング" back={back} />
      <div className="rd-sp-stats">
        {STATS.map((s) => (
          <div key={s.label} className="rd-box rd-sp-stat"><span>{s.label}</span><b>{s.value}<small>{s.unit}</small></b></div>
        ))}
      </div>
      <div className="rd-box rd-sp-owl">
        <svg viewBox="0 0 46 46" aria-hidden="true"><path d="M30 6a18 18 0 1 0 10 28A15 15 0 0 1 30 6Z" fill="#F6E7C8" /><path d="M8 10l1.4 3.2 3.2 1.4-3.2 1.4L8 19.2l-1.4-3.2L3.4 14.6l3.2-1.4Z" fill="#F4C451" /></svg>
        <div><p>いちばん夜ふかしのコミット</p><b>{NIGHT_OWL.time}</b><p>{NIGHT_OWL.date} ・ {NIGHT_OWL.who}「{NIGHT_OWL.what}」</p></div>
      </div>
      <h2 className="rd-sp-h">できるまで</h2>
      <ol className="rd-sp-hist">
        {HISTORY.map((h) => (
          <li key={h.date} className={h.now ? 'is-now' : ''}><time>{h.date}</time><span>{h.text}</span></li>
        ))}
      </ol>
      <h2 className="rd-sp-h">ボツ案ギャラリー</h2>
      <ul className="rd-sp-gal">
        {GALLERY.map((g) => (
          <li key={g.src} className={g.now ? 'is-now' : ''}>
            <figure><img src={g.src} alt={`${g.title}の画面`} loading="lazy" /><figcaption>{g.title}<small>{g.note}</small></figcaption></figure>
          </li>
        ))}
      </ul>
      <p className="rd-sp-src">数字は 2026年10月23日の GitHub から</p>
    </>
  );
}

// ---------------------------------------------------------------- ターミナル（自由に打てる）
// 全角は2文字ぶんで数える（吹き出しの幅をそろえるため）
const width = (s) => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 0xff ? 2 : 1), 0);
function pumpkinsay(text) {
  const t = text || 'トリック・オア・スタンプ！';
  const w = width(t);
  return [` ${'_'.repeat(w + 2)}`, `< ${t} >`, ` ${'-'.repeat(w + 2)}`, '      \\   _\\/_', '       \\ /  ^  ^ \\', '        |  \\_/\\_/ |', "         '-.____.-'"].join('\n');
}

function runCommand(input, ctx) {
  const [cmd, ...args] = input.trim().split(/\s+/);
  const arg = args.join(' ');
  switch (cmd) {
    case '': return [];
    case 'help': return HELP.map(([c, d]) => ({ kind: 'out', text: `${c.padEnd(18)}${d}` }));
    case 'whoami': return [{ kind: 'out', text: `guest #${pad4(ctx.no)}（特別室の入室証あり）` }];
    case 'ls': return [{ kind: 'out', text: 'members/  making-of/  photo/  window/  blackboard/  safe/' }];
    case 'cat':
      if (arg === 'members.txt') return ctx.members.map((m) => ({ kind: 'out', text: `${m.name.padEnd(12)}${m.parts[0]}` }));
      return [{ kind: 'err', text: `cat: ${arg || '(なし)'}: ファイルがありません（cat members.txt）` }];
    case 'git': return GIT_LOG.map((l) => ({ kind: 'out', text: l }));
    case 'fortune': return [{ kind: 'ok', text: FORTUNES[Math.floor(Math.random() * FORTUNES.length)] }];
    case 'pumpkinsay': return [{ kind: 'art', text: pumpkinsay(arg) }];
    case 'sudo': return [{ kind: 'warn', text: arg === 'open safe' ? '金庫のカギは、まだどこにも見つかっていません。' : 'guest には sudo できません。' }];
    case 'rm': return [{ kind: 'warn', text: 'やめて！ 特別室がこわれます。' }];
    default: return [{ kind: 'err', text: `command not found: ${cmd}（help で一覧）` }];
  }
}

const QUICK = ['help', 'whoami', 'fortune', 'git log', 'pumpkinsay'];
const WELCOME = [{ kind: 'out', text: '特別室のターミナルです。help と打つと、使えるコマンドが出ます。' }];

function Term({ back, no, history }) {
  const [lines, setLines] = useState(history ?? WELCOME);
  const [value, setValue] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [lines]);
  const run = (input) => {
    const c = input.trim();
    if (c === 'exit') { back.onClick(); return; }
    if (c === 'clear') { setLines([]); return; }
    setLines((ls) => [...ls, { kind: 'cmd', text: c }, ...runCommand(c, { no, members: MEMBERS })].slice(-60));
  };
  return (
    <>
      <Title name="ターミナル" back={back} />
      <div className="rd-sp-tty">
        {lines.map((l, i) => (l.kind === 'art'
          ? <pre key={i}>{l.text}</pre>
          : <p key={i} className={`rd-sp-ln rd-sp-ln--${l.kind}`}>{l.kind === 'cmd' && <span className="rd-sp-ps">guest:~$ </span>}{l.text}</p>))}
        <form className="rd-sp-prompt" onSubmit={(e) => { e.preventDefault(); run(value); setValue(''); }}>
          <span className="rd-sp-ps">guest:~$</span>
          <input ref={endRef} value={value} onChange={(e) => setValue(e.target.value)} aria-label="コマンド" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck="false" enterKeyHint="send" />
        </form>
      </div>
      <div className="rd-sp-chips" aria-label="よく使うコマンド">
        {QUICK.map((q) => <button key={q} type="button" onClick={() => run(q)}>{q}</button>)}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- 記念写真（入室証を画像にして保存）
async function savePhoto({ no, cells, lines, stampImage, date }) {
  const W = 900, H = 1180;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const font = (px, fam = "'Yusei Magic', sans-serif") => `${px}px ${fam}`;
  g.fillStyle = '#F6E7C8'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3B2340'; g.fillRect(50, 50, W - 100, 820);
  g.fillStyle = '#F4C451'; g.font = font(40, "'Zen Kaku Gothic New', sans-serif"); g.fillText('特別室 入室証', 100, 150);
  g.fillStyle = '#F6E7C8'; g.font = font(120); g.fillText(`No.${pad4(no)}`, 100, 290);
  g.fillStyle = '#D9C6A0'; g.font = font(40, "'Zen Kaku Gothic New', sans-serif"); g.fillText(`${date} ・ CodeFlow 402`, 100, 360);
  const on = new Set(cells.filter((x) => x.filled).map((x) => x.index));
  const line = new Set(lines.flat());
  for (let i = 0; i < 9; i += 1) {
    const x = 100 + (i % 3) * 120, y = 440 + Math.floor(i / 3) * 120;
    g.fillStyle = line.has(i) ? '#F4C451' : on.has(i) ? '#FBE08A' : '#FFF6E2'; g.fillRect(x, y, 104, 104);
    g.strokeStyle = on.has(i) ? '#EE7A2B' : '#C9AE84'; g.lineWidth = 8; g.setLineDash(on.has(i) ? [] : [14, 10]); g.strokeRect(x + 4, y + 4, 96, 96);
  }
  if (stampImage) {
    const img = new Image(); img.src = `/stamps/${stampImage}`;
    await img.decode().catch(() => {});
    if (img.naturalWidth) { g.save(); g.translate(660, 720); g.rotate(-.2); g.drawImage(img, -150, -150, 300, 300); g.restore(); }
  }
  g.fillStyle = '#3B2340'; g.font = font(64); g.textAlign = 'center'; g.fillText('特別室に入りました！', W / 2, 1010);
  g.fillStyle = '#4E3550'; g.font = font(34, "'Zen Kaku Gothic New', sans-serif"); g.fillText('学園祭スタンプラリー', W / 2, 1080);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], `special-room-${pad4(no)}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function Photo({ back, no, cells, lines, stampImage, date }) {
  const [busy, setBusy] = useState(false);
  const on = new Set(cells.filter((x) => x.filled).map((x) => x.index));
  const line = new Set(lines.flat());
  const save = async () => { setBusy(true); try { await savePhoto({ no, cells, lines, stampImage, date }); } finally { setBusy(false); } };
  return (
    <>
      <Title name="記念写真" back={back} />
      <figure className="rd-box rd-sp-photo" style={{ margin: 0 }}>
        <div className="rd-sp-photo-pic">
          <div>
            <p className="rd-sp-pass-head">特別室 入室証</p>
            <p className="rd-sp-pass-no">No.{pad4(no)}</p>
            <p>{date} ・ CodeFlow 402</p>
          </div>
          <div className="rd-sp-mini" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => <span key={i} className={line.has(i) ? 'is-on is-line' : on.has(i) ? 'is-on' : ''} />)}
          </div>
          {stampImage && <img className="rd-sp-photo-stamp" src={`/stamps/${stampImage}`} alt="" />}
        </div>
        <figcaption className="rd-sp-photo-cap">特別室に入りました！</figcaption>
      </figure>
      <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={save} disabled={busy}>{busy ? 'つくっています…' : '画像を保存する'}</button>
      <p className="rd-note">あなたのビンゴカードと入室証が、1枚の画像になります</p>
    </>
  );
}

// ---------------------------------------------------------------- 本体
export default function SpecialRoom({ no = 1, cells, lines, stampImage = '', date = '2026.10.31', onExit, view: firstView = 'room', flipped, avatars = true, history }) {
  const [view, setView] = useState(firstView);
  const [board, setBoard] = useState({ cells: cells ?? [], lines: lines ?? [] });
  // ビンゴのマスを渡されていないときは、自分で取る（取れなくても記念写真は空のマスで出せる）
  useEffect(() => {
    if (cells) return undefined;
    let alive = true;
    fetch('/api/bingo').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (alive && d) setBoard({ cells: d.cells ?? [], lines: d.bingo_lines ?? [] });
    }).catch(() => {});
    return () => { alive = false; };
  }, [cells]);
  const toRoom = { label: '特別室', onClick: () => setView('room') };
  if (view === 'members') return <Members back={toRoom} flipped={flipped} avatars={avatars} />;
  if (view === 'making') return <Making back={toRoom} />;
  if (view === 'term') return <Term back={toRoom} no={no} history={history} />;
  if (view === 'photo') return <Photo back={toRoom} no={no} cells={board.cells} lines={board.lines} stampImage={stampImage} date={date} />;
  return (
    <>
      <Room no={no} open={setView} />
      <button type="button" className="rd-btn rd-btn--line" onClick={onExit}>← ビンゴに戻る</button>
    </>
  );
}
