import { useState, useEffect, useRef } from 'react';
import { Icon, Pumpkin, Title } from './parts.jsx';
import Loader from './Loader.jsx';
import LoadError from './LoadError.jsx';
import { NETWORK_ERROR, errorMessage } from '../api/errors';

// スタンプ図鑑。全スポットを番号（スポットID）順に並べ、スタンプを取ったスポットは絵と名前、まだのスポットは ？ で出す
// 取ったスポットを押すと、説明文と場所（何階のどこか）を出す
// 中身は GET /api/zukan。まだ取っていないスポットの名前・場所・説明はサーバーが返さない（開発者ツールでも見えない）

const TYPE_LABEL = {
  food:     '飲食',
  activity: '企画',
  codeflow: 'Codeflow',
};

// 図鑑の番号（No.01 など）
function zukanNo(spotId) {
  return `No.${String(spotId).padStart(2, '0')}`;
}

// スタンプを取った日時（10/14 13:05）
const stampedAtFormat = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// スタンプの絵。ビンゴのマスと同じ画像（public/stamps/ のファイル名）で、画像がないとき・読み込めなかったときはかぼちゃ
function StampArt({ image, className = '' }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`rd-zk-art ${className}`}>
      {image && !broken
        ? <img src={`/stamps/${image}`} alt="" onError={() => setBroken(true)} />
        : <Pumpkin />}
    </span>
  );
}

// 取ったスポットの詳細。画面いちばん上の層（<dialog> の showModal）に出すので、かぼちゃのメニューより上に重なる
// 閉じるのは「閉じる」・外側を押す・Esc（どれも dialog の close イベント → onClose）
function StampDetail({ entry, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    // StrictMode では effect が2回走るので、開いていないときだけ開く（閉じるのは onClose で外したとき。DOM から消えれば閉じる）
    if (!dialog.open) dialog.showModal();
  }, []);
  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className="rd-zk-dialog"
      aria-labelledby="rd-zk-name"
      onClose={onClose}
      // 外側（暗いところ）を押したときは dialog 自身が押されたことになる
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="rd-zk-detail">
        <div className="rd-zk-detail-head">
          <span className="rd-zk-no">{zukanNo(entry.spot_id)}</span>
          <span className="rd-zk-type">{TYPE_LABEL[entry.type] ?? ''}</span>
        </div>
        <StampArt image={entry.stamp_image} className="rd-zk-art--big" />
        <h2 id="rd-zk-name">{entry.name}</h2>
        <p className={`rd-zk-intro${entry.intro ? '' : ' is-empty'}`}>{entry.intro || '説明は準備中です'}</p>
        <dl className="rd-dl rd-zk-dl">
          {/* テラスなど階で言えない場所は、階を空にして場所だけ出す */}
          {entry.floor && <><dt>階</dt><dd>{entry.floor}</dd></>}
          {entry.place && <><dt>場所</dt><dd>{entry.place}</dd></>}
          {entry.stamped_at && <><dt>獲得</dt><dd>{stampedAtFormat.format(new Date(entry.stamped_at))}</dd></>}
        </dl>
        <button type="button" className="rd-btn rd-btn--pri" onClick={close}>閉じる</button>
      </div>
    </dialog>
  );
}

const Zukan = ({ navigate, openGuide }) => {
  // null: 確認中 / 配列: 図鑑（全スポット分）
  const [entries, setEntries] = useState(null);
  // 未スタート(401)か
  const [notStarted, setNotStarted] = useState(false);
  const [message, setMessage] = useState('');
  // 詳細を開いているスポット（null: 閉じている）
  const [selected, setSelected] = useState(null);
  // 増やすと図鑑を取り直す（再読み込みボタン）
  const [reloadKey, setReloadKey] = useState(0);

  // 開いたときと、再読み込みボタンを押したときに図鑑を取る
  useEffect(() => {
    // 取り終わる前に画面を離れたら、結果は捨てる
    let alive = true;
    (async () => {
      // 通信できなかったときは NETWORK_ERROR のまま
      let status = NETWORK_ERROR;
      try {
        const res = await fetch('/api/zukan');
        status = res.status;
        if (!alive) return;
        if (res.status === 401) {
          setNotStarted(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '不明なエラー');
        if (alive) setEntries(data);
      } catch (err) {
        console.error('図鑑取得失敗:', err);
        if (alive) setMessage(errorMessage(status));
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  // 再読み込みボタン押下時:エラー表示を消して(読み込み中の表示に戻して)取り直す
  const handleRetry = () => {
    setMessage('');
    setReloadKey((n) => n + 1);
  };

  const back = { label: 'ビンゴ', onClick: () => navigate('bingo') };

  // まだはじめていない人は、はじめるところへ案内する
  if (notStarted) {
    return (
      <>
        <Title name="スタンプ図鑑" back={back} />
        <section className="rd-box rd-box--lead">
          <p role="status">遊び方の最後の「はじめる」を押すと、集めたスタンプが図鑑に並びます</p>
        </section>
        <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={openGuide}>遊び方を見てはじめる →</button>
      </>
    );
  }

  if (!entries) {
    return (
      <>
        <Title name="スタンプ図鑑" back={back} />
        {message ? <LoadError message={message} /> : <Loader />}
        {message && <button type="button" className="rd-btn rd-btn--big" onClick={handleRetry}>再読み込み ↻</button>}
      </>
    );
  }

  const acquiredCount = entries.filter((e) => e.acquired).length;
  const total = entries.length;
  const progressPercent = total > 0 ? Math.min(100, (acquiredCount / total) * 100) : 0;

  return (
    <>
      <Title name="スタンプ図鑑" sub={`${acquiredCount}/${total}`} back={back} />

      {/* 進捗バー（ビンゴと同じ見た目） */}
      <div className="rd-progress">
        <span className="rd-progress-num">{acquiredCount}/{total}</span>
        <div className="rd-progress-bar">
          <div className="rd-progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <span className="rd-progress-rest">
          {acquiredCount >= total ? 'コンプリート!' : `あと${total - acquiredCount}か所`}
        </span>
      </div>

      <p className="rd-note">
        {acquiredCount > 0
          ? 'スタンプを押すと、説明と場所が見られます'
          : 'スポットの QR コード・NFC タグを読み込むと、ここにスタンプが並びます'}
      </p>

      <ul className="rd-zk" aria-label="スタンプ図鑑">
        {entries.map((entry) => (
          <li key={entry.spot_id}>
            {entry.acquired ? (
              <button type="button" className="rd-zk-card is-on" aria-haspopup="dialog" onClick={() => setSelected(entry)}>
                <span className="rd-zk-no">{zukanNo(entry.spot_id)}</span>
                <StampArt image={entry.stamp_image} />
                <span className="rd-zk-name">{entry.name}</span>
              </button>
            ) : (
              // まだ取っていないスポットは、番号と種別だけ（名前・場所はサーバーも返さない）
              <div className="rd-zk-card is-off">
                <span className="rd-zk-no">{zukanNo(entry.spot_id)}</span>
                <span className="rd-zk-art"><span className="rd-zk-q" role="img" aria-label="まだ取っていないスポット">？</span></span>
                <span className="rd-zk-type">{TYPE_LABEL[entry.type] ?? ''}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {acquiredCount < total && (
        <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('scan')}><Icon name="scan" />QR・NFC読込</button>
      )}
      <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>← ビンゴに戻る</button>

      {selected && <StampDetail entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

export default Zukan;
