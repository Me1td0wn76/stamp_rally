import { useState, useRef } from 'react';
import { postStamp } from '../api/stamps';
import { Icon, Title } from './parts.jsx';

// NFC の読み取り画面。処理は今の画面（components/Bingo.jsx）の NFC 部分をそのまま移したもの。
// ちがいは、スタンプ取得後に盤面を読み直す代わりに「ビンゴを見る」ボタンを出すところと、
// 未スタート(401)のときにスタートボタンのあるビンゴ画面へ移るところ
// （ビンゴ画面は開くたびに盤面を読み込む）

// Web NFC 非対応(iPhone など)のときの案内
// タグに書かれた URL は OS が読み取って通知を出し、タップするとこのアプリが ?spot=<トークン> 付きで開く
const NFC_URL_GUIDE = 'NFCタグにスマホを近づけると通知が出ます。通知をタップするとスタンプが付きます';

const Nfc = ({ navigate }) => {
  const [message, setMessage] = useState('');
  const [acquired, setAcquired] = useState(false);
  // Web NFC が使えるか（元の画面では effect で設定していたものを、最初の state で判定）
  const [nfcSupported] = useState(() => 'NDEFReader' in window);
  const [nfcScanning, setNfcScanning] = useState(false);
  const nfcAbortRef = useRef(null);

  // NFCスキャンを止める(NDEFReader の読み取りを AbortController で中断する)
  const abortNfcScan = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setNfcScanning(false);
  };

  // スタンプ取得
  // 401(未スタート・IDが無効)のときは、タグをかざすたびに 401 のリクエストが飛び続けないようスキャンを止め、
  // スタートボタンのあるビンゴ画面へ移る
  const acquireStamp = async (body) => {
    const { status, message } = await postStamp('nfc', body);
    if (status === 401) {
      abortNfcScan();
      navigate('bingo');
      return;
    }
    setMessage(message);
    if (status === 201) setAcquired(true);
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
    abortNfcScan();
    setMessage('NFCスキャンを停止しました');
  };

  return (
    <>
      <Title name="NFC読み込み" back={{ label: 'ビンゴ', onClick: () => navigate('bingo') }} />

      <section className={`rd-nfc${nfcScanning ? ' is-on' : ''}`}>
        <div className="rd-nfc-ring"><Icon name="nfc" /></div>
        <p>{nfcScanning ? 'NFCタグをスマートフォンにかざしてください' : '各会場の NFC タグを読み取るとスタンプがもらえます'}</p>
      </section>

      {message && <p className="rd-msg" role="status">{message}</p>}
      {!nfcSupported && <p className="rd-note">※ {NFC_URL_GUIDE}</p>}

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
