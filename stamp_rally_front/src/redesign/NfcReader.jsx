import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Icon } from './parts.jsx';

// NFC タグを読む部分（読み込み画面 Scan.jsx の下半分）。Web NFC(NDEFReader)が使えるのは Android の Chrome だけ
// タグには https://<ドメイン>/?spot=<トークン> の URL が書いてある（#22）ので、タグの UID ではなく NDEF のレコードを読み、
// 中の文字の一覧を onRead に渡す（トークンを取り出して送るのは呼び出し側）
// 使えないスマホ(iPhone など)では、OS の通知から開く方法を案内する

// Web NFC が使えるか
const NFC_SUPPORTED = 'NDEFReader' in window;

// Web NFC が使えないとき(iPhone など)の案内
// タグに書かれた URL は OS が読み取って通知を出し、タップするとこのアプリが ?spot=<トークン> 付きで開く
const NFC_URL_GUIDE = 'NFC タグにスマホを近づけると通知が出ます。通知をタップするとスタンプがもらえます';

// NFC の読み取りを始められなかったときの文（NDEFReader.scan が投げる例外の name ごと）
function nfcErrorMessage(err) {
  switch (err.name) {
    case 'NotAllowedError':
      return 'NFC の使用が許可されていません。ブラウザの設定で NFC を許可してから、もう一度試してください';
    case 'NotReadableError':
      return 'NFC を使えません。スマホの設定で NFC がオンになっているか確かめてください';
    case 'NotSupportedError':
      return 'このスマホは NFC の読み取りに対応していません。上のカメラで QR コードを読み取ってください';
    default:
      return 'NFC の読み取りを始められませんでした。もう一度試してください';
  }
}

// NDEF のレコードから文字を取り出す
// URL のレコードと、文字のレコード（URL が書かれていることがある）を読む。スマートポスターは中のレコードを読む
function textsIn(records) {
  const texts = [];
  for (const record of records) {
    try {
      switch (record.recordType) {
        case 'url':
        case 'absolute-url':
          texts.push(new TextDecoder().decode(record.data));
          break;
        case 'text':
          texts.push(new TextDecoder(record.encoding || 'utf-8').decode(record.data));
          break;
        case 'smart-poster':
          texts.push(...textsIn(record.toRecords() ?? []));
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('NFC のレコードを読めませんでした:', err);
    }
  }
  return texts;
}

export default function NfcReader({ onRead }) {
  const [scanning, setScanning] = useState(false);
  // 始められなかった・タグを読めなかったときの文（空ならふだんの案内を出す）
  const [status, setStatus] = useState('');
  // 読み取りを止めるための AbortController（読み取り中・始めている途中だけある）
  const abortRef = useRef(null);
  // onRead は描画のたびに作り直されるので、タグを読んだときは最新のものを呼ぶ
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  // NFCスキャン開始
  const start = async () => {
    if (!NFC_SUPPORTED || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    try {
      const ndef = new window.NDEFReader();
      ndef.addEventListener('reading', ({ message }) => {
        setStatus('');
        onReadRef.current(textsIn(message.records));
      }, { signal });
      // タグはあったが中を読めなかった（書き込まれていない・対応していない形式など）
      ndef.addEventListener('readingerror', () => {
        setStatus('NFC タグを読み取れませんでした。もう一度かざしてください');
      }, { signal });
      await ndef.scan({ signal });
      if (signal.aborted) return;
      setStatus('');
      setScanning(true);
    } catch (err) {
      if (abortRef.current === controller) abortRef.current = null;
      if (signal.aborted) return;
      console.error('NFCスキャン失敗:', err);
      setStatus(nfcErrorMessage(err));
      setScanning(false);
    }
  };

  // NFCスキャン停止(NDEFReader の読み取りを AbortController で中断する)
  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('');
    setScanning(false);
  };

  // NFC をもう許可している人は、開いたらすぐ読み取りを始める
  // まだの人は、許可を聞くためにボタンを押してもらう（Web NFC は、押したときでないと許可を聞けない）
  const startIfAllowed = useEffectEvent(() => {
    start();
  });
  useEffect(() => {
    if (!NFC_SUPPORTED || !navigator.permissions) return undefined;
    let alive = true;
    navigator.permissions.query({ name: 'nfc' })
      .then((permission) => {
        if (alive && permission.state === 'granted') startIfAllowed();
      })
      .catch(() => {
        // 調べられないときは、ボタンで始めてもらう
      });
    return () => {
      alive = false;
    };
  }, []);

  // 画面を離れたら読み取りを止める（止めないと、ほかの画面でもタグを読んでスタンプを送ってしまう）
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  let text = NFC_URL_GUIDE;
  if (NFC_SUPPORTED) {
    text = status || (scanning
      ? 'スポットの NFC タグにスマホをかざしてね'
      : '「NFC読込」を押してから、スポットの NFC タグにスマホをかざしてね');
  }

  return (
    <section className={`rd-nfc${scanning ? ' is-on' : ''}`}>
      <div className="rd-nfc-ring" aria-hidden="true"><Icon name="nfc" /></div>
      <div className="rd-nfc-text">
        <h2>NFC タグ</h2>
        <p role="status">{text}</p>
      </div>
      {NFC_SUPPORTED && (
        <button
          type="button"
          className={`rd-btn ${scanning ? 'rd-btn--warn' : 'rd-btn--pri'}`}
          onClick={scanning ? stop : start}
        >
          {scanning ? 'NFC読込を止める' : 'NFC読込'}
        </button>
      )}
    </section>
  );
}
