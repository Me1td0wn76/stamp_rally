import { useEffect, useReducer, useRef } from 'react';
import { Title } from './parts.jsx';
import SpecialTicket from './SpecialTicket.jsx';

// 特別室の金庫。特別室でしかできないゲーム「金庫破り」。
// 3けたの暗証番号（0〜9 のちがう数字）を、MAX_TRIES 回までに当てる。数字を入れて「開ける」を押すたびに、
// ヒット（数字も場所も合っている）とブロー（数字は合っているが、場所がちがう）の数が出る（ヒット・アンド・ブロー）。
// 開けると金のチケットがもらえる（記念写真が金色になる）。暗証番号はこの端末の中で決め、サーバーとは通信しない。
// キーボードでも遊べる（数字・Backspace・Enter）。
//
// best: いちばん早く開けた回数（まだ開けていなければ 0）/ onOpen(tries): 開けたとき / onPhoto: 記念写真を見る
// back: 特別室に戻る（Title の戻る）/ no・date・stampImage: 金のチケットに出す

const DIGITS = 3;
const MAX_TRIES = 10;

// 暗証番号を決める（0〜9 を混ぜて、前から DIGITS 個）
function makeCode() {
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DIGITS);
}

function judge(code, guess) {
  let hit = 0, blow = 0;
  guess.forEach((d, i) => {
    if (code[i] === d) hit += 1;
    else if (code.includes(d)) blow += 1;
  });
  return { hit, blow };
}

// phase: ready（説明）→ play → open（開いた）/ alarm（回数切れで警報）
const INITIAL = { phase: 'ready', code: [], input: [], log: [] };
function reducer(s, a) {
  switch (a.type) {
    case 'start':
      return { phase: 'play', code: a.code, input: [], log: [] };
    case 'digit':
      if (s.phase !== 'play' || s.input.length >= DIGITS || s.input.includes(a.digit)) return s;
      return { ...s, input: [...s.input, a.digit] };
    case 'erase':
      return s.phase === 'play' ? { ...s, input: s.input.slice(0, -1) } : s;
    case 'submit': {
      if (s.phase !== 'play' || s.input.length < DIGITS) return s;
      const result = judge(s.code, s.input);
      const log = [...s.log, { guess: s.input, ...result }];
      const phase = result.hit === DIGITS ? 'open' : log.length >= MAX_TRIES ? 'alarm' : 'play';
      return { ...s, phase, input: [], log };
    }
    default:
      return s;
  }
}

// ヒット・ブローの印（ヒットは金の丸、ブローは金のふちの丸、どちらでもない数字は点線の丸）。size は丸の数（説明の見本は 1）
function Pegs({ hit, blow, size = DIGITS }) {
  return (
    <span className="rd-sf-pegs" aria-hidden="true">
      {Array.from({ length: size }, (_, i) => <i key={i} className={i < hit ? 'is-hit' : i < hit + blow ? 'is-blow' : ''} />)}
    </span>
  );
}

// 金庫の絵（扉・暗証番号の窓・ダイヤル・取っ手）。開くと扉が手前に回り、中の金色の光が見える
function Safe({ phase, digits, turn }) {
  return (
    <div className={`rd-sf-safe is-${phase}`} aria-hidden="true">
      <div className="rd-sf-inside"><span className="rd-sf-glow" /></div>
      <div className="rd-sf-door">
        <i className="rd-sf-bolt" /><i className="rd-sf-bolt" /><i className="rd-sf-bolt" /><i className="rd-sf-bolt" />
        <div className="rd-sf-panel">
          {Array.from({ length: DIGITS }, (_, i) => (
            <span key={i} className={digits[i] === undefined ? 'is-empty' : ''}>{digits[i] ?? '-'}</span>
          ))}
        </div>
        <div className="rd-sf-dial" style={{ '--turn': turn }} />
        <span className="rd-sf-handle" />
      </div>
      <span className="rd-sf-siren" />
    </div>
  );
}

export default function SpecialSafe({ back, best = 0, onOpen, onPhoto, no, date, stampImage }) {
  const [s, dispatch] = useReducer(reducer, INITIAL);
  const start = () => dispatch({ type: 'start', code: makeCode() });

  // 開いたら親に知らせる（最短記録と金のチケットを残してもらう）
  const onOpenRef = useRef(onOpen);
  useEffect(() => { onOpenRef.current = onOpen; });
  const tries = s.log.length;
  useEffect(() => {
    if (s.phase === 'open') onOpenRef.current?.(tries);
  }, [s.phase, tries]);

  // キーボード：数字・Backspace はいつでも、Enter はボタンの上でないときだけ（ボタンの上の Enter はそのボタンを押す）
  useEffect(() => {
    if (s.phase !== 'play') return undefined;
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) dispatch({ type: 'digit', digit: Number(e.key) });
      else if (e.key === 'Backspace') dispatch({ type: 'erase' });
      else if (e.key === 'Enter' && !e.target.closest?.('button')) dispatch({ type: 'submit' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.phase]);

  const last = s.log[s.log.length - 1];
  // ダイヤルは、数字を入れるたび・開けるたびに回す
  const turn = tries * DIGITS + s.input.length;

  return (
    <>
      <Title name="金庫" sub={best ? `最短 ${best}回` : undefined} back={back} />
      <div className={`rd-sf is-${s.phase}`}>
        <Safe phase={s.phase} digits={s.phase === 'open' ? s.code : s.input} turn={turn} />

        {s.phase === 'ready' && (
          <>
            <section className="rd-box rd-sf-rule">
              <h2>暗証番号を当てて、金庫を開けよう</h2>
              <p>暗証番号は <b>{DIGITS}けた</b>。0〜9 の<b>ちがう数字</b>でできています。{MAX_TRIES}回までに当てると開きます。</p>
              <dl className="rd-sf-legend">
                <dt><Pegs hit={1} blow={0} size={1} />ヒット</dt><dd>数字も場所も合っている</dd>
                <dt><Pegs hit={0} blow={1} size={1} />ブロー</dt><dd>数字は合っているが、場所がちがう</dd>
              </dl>
              <p className="rd-sf-reward">開けると、金のチケットが手に入ります</p>
            </section>
            <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={start}>{best ? 'もう一度挑戦する' : '挑戦する'}</button>
          </>
        )}

        {s.phase === 'play' && (
          <>
            <p className="rd-sf-status" role="status">
              {last ? `${last.guess.join('')} は ${last.hit}ヒット ${last.blow}ブロー。` : '数字を3つ入れて「開ける」'}
              <span>のこり {MAX_TRIES - tries}回</span>
            </p>
            <div className="rd-sf-keys">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button key={d} type="button" className="rd-btn rd-sf-key" disabled={s.input.includes(d) || s.input.length >= DIGITS} onClick={() => dispatch({ type: 'digit', digit: d })}>{d}</button>
              ))}
              <button type="button" className="rd-btn rd-sf-key rd-sf-key--sub" disabled={!s.input.length} onClick={() => dispatch({ type: 'erase' })}>けす</button>
              <button type="button" className="rd-btn rd-sf-key" disabled={s.input.includes(0) || s.input.length >= DIGITS} onClick={() => dispatch({ type: 'digit', digit: 0 })}>0</button>
              <button type="button" className="rd-btn rd-btn--pri rd-sf-key rd-sf-key--sub" disabled={s.input.length < DIGITS} onClick={() => dispatch({ type: 'submit' })}>開ける</button>
            </div>
          </>
        )}

        {s.phase === 'open' && (
          <>
            <p className="rd-msg rd-msg--strong">金庫が開きました！</p>
            <p className="rd-sf-result" role="status">{tries}回で開けました{best && tries <= best ? '（最短記録）' : ''}。金のチケットを手に入れました</p>
            <SpecialTicket no={no} date={date} stampImage={stampImage} gold punched className="rd-sf-ticket" />
            <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={onPhoto}>金の記念写真を見る</button>
            <button type="button" className="rd-btn" onClick={start}>もう一度挑戦する</button>
          </>
        )}

        {s.phase === 'alarm' && (
          <>
            <p className="rd-sf-alarm" role="alert">警報！ 暗証番号は <b>{s.code.join(' ')}</b> でした</p>
            <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={start}>もう一度挑戦する</button>
          </>
        )}

        {s.log.length > 0 && s.phase !== 'ready' && (
          <ol className="rd-sf-log" aria-label="これまでの答え" reversed>
            {[...s.log].reverse().map((r, i) => (
              <li key={s.log.length - i}>
                <span className="rd-sf-try">{s.log.length - i}回目</span>
                <b>{r.guess.join('')}</b>
                <Pegs hit={r.hit} blow={r.blow} />
                <span className="rd-sf-hb">{r.hit}ヒット {r.blow}ブロー</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
