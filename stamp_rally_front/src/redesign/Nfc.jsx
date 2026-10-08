import { useState, useRef } from 'react';
import { Icon, Title } from './parts.jsx';

// NFC の読み取り画面。処理は今の画面（components/Bingo.jsx）の NFC 部分をそのまま移したもの。
// ちがいは、スタンプ取得後に盤面を読み直す代わりに「ビンゴを見る」ボタンを出すところだけ
// （ビンゴ画面は開くたびに盤面を読み込む）

const USER_ID = 'user_001';

const Nfc = ({ navigate }) => {
  const [message, setMessage] = useState('');
  const [acquired, setAcquired] = useState(false);
  // Web NFC が使えるか（元の画面では effect で設定していたものを、最初の state で判定）
  const [nfcSupported] = useState(() => 'NDEFReader' in window);
  const [nfcScanning, setNfcScanning] = useState(false);
  const nfcAbortRef = useRef(null);

  // スタンプ取得（共通）
  const acquireStamp = async (body) => {
    const res = await fetch('/api/stamps/nfc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 201) {
      setMessage('スタンプを取得しました！');
      setAcquired(true);
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
        acquireStamp({ user_id: USER_ID, nfc_uid: uid });
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

  return (
    <>
      <Title name="NFC読み込み" back={{ label: 'ホーム', onClick: () => navigate('home') }} />

      <section className={`rd-nfc${nfcScanning ? ' is-on' : ''}`}>
        <div className="rd-nfc-ring"><Icon name="nfc" /></div>
        <p>{nfcScanning ? 'NFCタグをスマートフォンにかざしてください' : '各会場の NFC タグを読み取るとスタンプがもらえます'}</p>
      </section>

      {message && <p className="rd-msg" role="status">{message}</p>}
      {!nfcSupported && <p className="rd-note">※ この端末・ブラウザはWeb NFCに未対応です</p>}

      <button
        type="button"
        className={`rd-btn rd-btn--big ${nfcScanning ? 'rd-btn--warn' : 'rd-btn--pri'}`}
        onClick={nfcScanning ? stopNfcScan : startNfcScan}
        disabled={!nfcSupported}
      >
        {nfcScanning ? 'スキャン停止' : 'NFC読込'}
      </button>
      {acquired && <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>ビンゴを見る</button>}
    </>
  );
};

export default Nfc;
