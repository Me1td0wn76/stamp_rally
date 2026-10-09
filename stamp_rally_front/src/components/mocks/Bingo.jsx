import { useState, useEffect, useRef, useCallback } from 'react';
import '../../App.css'; // 共通のCSSを読み込み

const CELL_COUNT = 9;

const TYPE_LABEL = {
  food:     '飲食',
  activity: '企画',
  codeflow: 'Codeflow',
};

// ユーザーIDを発行してもらう(HttpOnly Cookie に保存される)
// モック画面にはスタートの流れが無いため、401 を受けたらこれを呼んで自動で登録する
// 発行済みの有効なIDがあればサーバーはそれを使い続けるので、進捗は消えない
const registerUser = async () => {
  const res = await fetch('/api/users', { method: 'POST' });
  if (!res.ok) throw new Error('ユーザー登録失敗');
};

const Bingo = ({ navigate, currentScreen }) => {
  const [bingo, setBingo] = useState({ stamped_ids: [], bingo_count: 0, bingo_lines: [], is_complete: false });
  const [message, setMessage] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const nfcAbortRef = useRef(null);

  // ビンゴ状況を取得(401 なら登録してから1回だけ取り直す)
  const fetchBingo = useCallback(async () => {
    try {
      let res = await fetch('/api/bingo');
      if (res.status === 401) {
        await registerUser();
        res = await fetch('/api/bingo');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '不明なエラー');
      setBingo(data);
    } catch (err) {
      setMessage('ビンゴ状況取得失敗: ' + err.message);
    }
  }, []);

  useEffect(() => {
    fetchBingo();
    setNfcSupported('NDEFReader' in window);
  }, [fetchBingo]);

  // スタンプ取得（共通）(401 なら登録してから1回だけ送り直す)
  const acquireStamp = async (body) => {
    const postStamp = () => fetch('/api/stamps/nfc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let res = await postStamp();
    if (res.status === 401) {
      try {
        await registerUser();
      } catch (err) {
        setMessage('エラー: ' + err.message);
        return;
      }
      res = await postStamp();
    }
    const data = await res.json();
    if (res.status === 201) {
      setMessage('スタンプを取得しました！');
      fetchBingo();
    } else if (res.status === 409) {
      setMessage('このスポットはすでにスタンプ済みです');
    } else {
      setMessage('エラー: ' + (data.error ?? '不明なエラー'));
    }
  };

  // NFCスキャン開始
  const startNfcScan = async () => {
    if (!nfcSupported) return;
    try {
      const ndef = new window.NDEFReader();
      const controller = new AbortController();
      nfcAbortRef.current = controller;

      await ndef.scan({ signal: controller.signal });
      setNfcScanning(true);
      setMessage('NFCタグをスマートフォンにかざしてください');

      ndef.addEventListener('reading', ({ serialNumber }) => {
        // シリアルナンバー（UID）をコロン区切り大文字に正規化
        const uid = serialNumber.toUpperCase().replace(/-/g, ':');
        setMessage(`NFCタグ検出: ${uid}`);
        acquireStamp({ nfc_uid: uid });
      });
    } catch (err) {
      setMessage('NFCスキャン失敗: ' + err.message);
      setNfcScanning(false);
    }
  };

  // NFCスキャン停止
  const stopNfcScan = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setNfcScanning(false);
    setMessage('NFCスキャンを停止しました');
  };

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
    <div className="screen">
      <div className="status-bar"><span>STAMP RALLY</span><span>●●●</span></div>
      <div className="nav-bar" style={{ background: '#FFD900' }}>
        <div className="nav-back clickable" onClick={() => navigate('home')}>‹ ホーム</div>
        <div className="nav-title">スタンプカード</div>
        <div style={{ width: '36px' }}></div>
      </div>
      
      <div style={{ background: '#FAFAFA', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* メッセージ領域 */}
        <div style={{ padding: '12px 12px 0' }}>
          {bingo.bingo_count > 0 && (
            <div style={{ background: '#FFD900', border: '2.5px solid #111', borderRadius: 8, padding: '8px', marginBottom: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '900', boxShadow: '2px 2px 0 #111' }}>
              {bingo.is_complete ? '🎉 全スポット制覇おめでとう！' : `🎯 ビンゴ ${bingo.bingo_count} ライン達成！`}
            </div>
          )}
          {message && (
            <div style={{ background: '#FFF', border: '2.5px solid #111', borderRadius: 8, padding: '8px', marginBottom: '4px', fontSize: '10px', fontWeight: '800', color: '#111' }}>
              ℹ️ {message}
            </div>
          )}
          {!nfcSupported && (
            <div style={{ color: '#FF2D8B', fontSize: '9px', fontWeight: '800', textAlign: 'center', marginTop: '4px' }}>
              ※ この端末・ブラウザはWeb NFCに未対応です
            </div>
          )}
        </div>

        {/* ビンゴグリッド */}
        <div className="bingo-grid">
          {cells.map((cell) => {
            const onBingoLine = completedLineSet.has(cell.index);
            
            return (
              <div 
                key={cell.index} 
                className={`b-cell ${cell.filled ? 'done' : ''}`}
                style={onBingoLine ? { borderColor: '#FF5F00', background: '#FFD900' } : {}}
              >
                {cell.filled ? (
                  <div className="stamp-dot filled">
                    <svg className="check-mark" viewBox="0 0 16 16"><polyline points="3,8 7,12 13,4" /></svg>
                  </div>
                ) : (
                  <div className="stamp-dot"></div>
                )}
                {TYPE_LABEL[cell.type] ?? ''}
              </div>
            );
          })}
        </div>

        {/* 進捗バー */}
        <div className="progress-row">
          <span className="progress-txt">{filledCount}/{totalCells}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="progress-txt" style={{ color: '#FF5F00' }}>
            {filledCount >= totalCells ? 'コンプリート!' : `あと${totalCells - filledCount}つ!`}
          </span>
        </div>

        {/* アクションボタン */}
        <div className="action-row">
          <div 
            className="act-btn qr clickable" 
            onClick={nfcScanning ? stopNfcScan : startNfcScan}
            style={{ background: nfcScanning ? '#FF2D8B' : '#00D4D4', color: nfcScanning ? '#FFF' : '#111' }}
          >
            <svg className="act-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {nfcScanning ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
                </>
              ) : (
                <>
                  <path d="M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM12 12h.01" />
                  <path d="M12 4v16M4 12h16" opacity="0.3" />
                </>
              )}
            </svg>
            {nfcScanning ? 'スキャン停止' : 'NFC読込'}
          </div>
          <div className="act-btn prize clickable" onClick={() => navigate('prize')}>
            <svg className="act-icon" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
            </svg>
            景品
          </div>
          <div className="act-btn info clickable" onClick={() => navigate('manual')}>
            <svg className="act-icon" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            説明
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
      </div>
    </div>
  );
};

export default Bingo;
