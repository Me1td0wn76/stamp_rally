import { useState, useEffect } from 'react';
import { Icon, Title } from './parts.jsx';

// ビンゴ。データの取り方・数え方は今の画面（components/Bingo.jsx）と同じ。
// NFC の読み取りは Nfc.jsx に分けたので、ここでは NFC 画面へのボタンだけ置く

const USER_ID = 'user_001';

const CELL_COUNT = 9;

const TYPE_LABEL = {
  food:     '飲食',
  activity: '企画',
  codeflow: 'Codeflow',
};

const Bingo = ({ navigate, openGuide }) => {
  const [bingo, setBingo] = useState({ stamped_ids: [], bingo_count: 0, bingo_lines: [], is_complete: false });
  const [message, setMessage] = useState('');

  // ビンゴ状況を取得
  const fetchBingo = () => {
    fetch(`/api/bingo/${USER_ID}`)
      .then((res) => res.json())
      .then((data) => setBingo(data))
      .catch((err) => setMessage('ビンゴ状況取得失敗: ' + err.message));
  };

  useEffect(() => {
    fetchBingo();
  }, []);

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
      <Title name="スタンプカード" sub={`${filledCount}/${totalCells}`} back={{ label: 'ホーム', onClick: () => navigate('home') }} />

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
            {cell.filled ? <span className="rd-cell-mark" aria-label="スタンプ済み">済</span> : <span className="rd-cell-state">まだ</span>}
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
        <button type="button" className="rd-btn" onClick={openGuide}><Icon name="manual" />説明</button>
      </div>
    </>
  );
};

export default Bingo;
