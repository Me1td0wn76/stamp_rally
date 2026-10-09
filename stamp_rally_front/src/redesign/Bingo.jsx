import { useState, useEffect, useRef, useCallback } from 'react';
import { postStamp } from '../api/stamps';
import { Icon, Pumpkin, Title } from './parts.jsx';
import Loader from './Loader.jsx';
import LoadError from './LoadError.jsx';

// ビンゴ。データの取り方・数え方・スタート・URL からのスタンプ取得は今の画面（components/Bingo.jsx）と同じ。
// NFC の読み取りは Nfc.jsx に分けたので、ここでは NFC 画面へのボタンだけ置く

const CELL_COUNT = 9;

const TYPE_LABEL = {
  food:     '飲食',
  activity: '企画',
  codeflow: 'Codeflow',
};

const Bingo = ({ navigate, openGuide, pendingSpotToken, clearPendingSpotToken, reloadSignal = 0 }) => {
  const [bingo, setBingo] = useState({ stamped_ids: [], bingo_count: 0, bingo_lines: [], is_complete: false });
  // スタート済みか(null: 確認中 / false: 未スタート / true: スタート済み)
  // ユーザーIDは HttpOnly Cookie にありJSから読めないため、APIの応答(401かどうか)で判定する
  const [started, setStarted] = useState(null);
  const [message, setMessage] = useState('');
  // 送信済みのスポットトークン(StrictMode で effect が2回走っても1回だけ送るため)
  const sentSpotTokenRef = useRef(null);

  // 401(未スタート・IDが無効)を受けたときの処理
  // メッセージが残っていると「スタートボタンを押すと…」が隠れるため、メッセージも消す
  const handleUnauthorized = useCallback(() => {
    setMessage('');
    setStarted(false);
  }, []);

  // ビンゴ状況を取得
  const fetchBingo = useCallback(async () => {
    try {
      const res = await fetch('/api/bingo');
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '不明なエラー');
      setBingo(data);
      setStarted(true);
    } catch (err) {
      setMessage('ビンゴ状況取得失敗: ' + err.message);
    }
  }, [handleUnauthorized]);

  // 開いたときと、遊び方の「はじめる」でスタートしたとき（reloadSignal が増えたとき）にビンゴ状況を取る
  useEffect(() => {
    fetchBingo();
  }, [fetchBingo, reloadSignal]);

  // 再読み込みボタン押下時:エラー表示を消して(読み込み中の表示に戻して)取り直す
  const handleRetry = () => {
    setMessage('');
    fetchBingo();
  };

  // スタンプ取得（URL から開いたとき用）。レスポンスのステータスを返す
  const acquireStamp = useCallback(async (kind, body) => {
    const { status, message } = await postStamp(kind, body);
    if (status === 401) {
      handleUnauthorized();
      return status;
    }
    setMessage(message);
    if (status === 201) fetchBingo();
    return status;
  }, [fetchBingo, handleUnauthorized]);

  // NFCタグ・QRコードの URL から開いたとき:スタート済みならトークンを送ってスタンプを取得する
  // 未スタート(401)ならトークンは残しておき、スタートして started が true になったら送り直す
  useEffect(() => {
    if (started !== true || !pendingSpotToken) return;
    if (sentSpotTokenRef.current === pendingSpotToken) return;
    sentSpotTokenRef.current = pendingSpotToken;

    (async () => {
      const status = await acquireStamp('qr', { qr_token: pendingSpotToken });
      if (status === 401) {
        sentSpotTokenRef.current = null;
      } else {
        clearPendingSpotToken();
      }
    })();
  }, [started, pendingSpotToken, acquireStamp, clearPendingSpotToken]);

  // 確認中（読み込み中）は、ロード画面の絵を小さく出す
  if (started === null && !message) {
    return (
      <>
        <Title name="ビンゴカード" />
        <Loader />
      </>
    );
  }

  // スタート前はビンゴカードを表示しない
  // 未スタートならスタートボタン、確認中に失敗(通信エラー・5xxなど)したら再読み込みボタンを表示する
  if (!started) {
    return (
      <>
        <Title name="ビンゴカード" />
        {/* 確認中に失敗したとき（通信エラー・5xxなど）は、読み込み失敗の絵を出す */}
        {started === null && message ? (
          <LoadError message={message} />
        ) : (
          <section className="rd-box rd-box--lead">
            <p role="status">
              {message
                ? message
                : pendingSpotToken
                    // NFCタグ・QRコードの URL から開いたが未スタートのとき
                    // 別のブラウザでスタートしていると Cookie が別なので、ここでは未スタート扱いになる
                    ? <>遊び方の最後の「はじめる」を押すとスタンプが付きます<br />別のブラウザではじめた人は、そのブラウザでもう一度開いてください</>
                    : '遊び方の最後の「はじめる」を押すとビンゴカードが表示されます'}
            </p>
          </section>
        )}
        {started === false && (
          <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={openGuide}>遊び方を見てはじめる →</button>
        )}
        {started === null && message && (
          <button type="button" className="rd-btn rd-btn--big" onClick={handleRetry}>再読み込み ↻</button>
        )}
        {started !== false && <button type="button" className="rd-btn" onClick={openGuide}><Icon name="manual" />遊び方</button>}
      </>
    );
  }

  // 盤面(取得前は空のマスを9個表示)
  const cells = bingo.cells?.length
    ? bingo.cells
    : Array.from({length:CELL_COUNT},(_,i)=>({index:i,type:null,filled:false}));

  // bingo_lines はマス番号(index)の配列
  const completedLineSet = new Set((bingo.bingo_lines ?? []).flat());

  // 進捗率の計算
  const filledCount = cells.filter((C)=>C.filled).length;
  const totalCells = cells.length;
  const progressPercent = Math.min(100, (filledCount / totalCells) * 100);

  return (
    <>
      <Title name="ビンゴカード" sub={`${filledCount}/${totalCells}`} />

      {/* メッセージ領域 */}
      {bingo.bingo_count > 0 && (
        <p className="rd-msg rd-msg--strong">
          {bingo.is_complete ? '全スポット制覇おめでとう！' : `ビンゴ ${bingo.bingo_count} ライン達成！`}
        </p>
      )}
      {message && <p className="rd-msg" role="status">{message}</p>}

      {/* ビンゴグリッド */}
      <ul className="rd-grid" aria-label="ビンゴの盤面">
        {cells.map((cell) => (
          <li
            key={cell.index}
            className={`rd-cell${cell.filled ? ' is-on' : ''}${completedLineSet.has(cell.index) ? ' is-line' : ''}`}
          >
            <span className="rd-cell-name">{TYPE_LABEL[cell.type] ?? ''}</span>
            {cell.filled ? <span className="rd-cell-mark" role="img" aria-label="スタンプ済み"><Pumpkin /></span> : <span className="rd-cell-state">まだ</span>}
          </li>
        ))}
      </ul>

      {/* 進捗バー */}
      <div className="rd-progress">
        <span className="rd-progress-num">{filledCount}/{totalCells}</span>
        <div className="rd-progress-bar">
          <div className="rd-progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <span className="rd-progress-rest">
          {filledCount >= totalCells ? 'コンプリート!' : `あと${totalCells - filledCount}つ!`}
        </span>
      </div>

      {/* アクションボタン */}
      <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('nfc')}><Icon name="nfc" />NFC読込</button>
      <div className="rd-row">
        <button type="button" className="rd-btn" onClick={() => navigate('prize')}><Icon name="prize" />景品</button>
        <button type="button" className="rd-btn" onClick={() => navigate('manual')}><Icon name="manual" />説明</button>
      </div>
    </>
  );
};

export default Bingo;
