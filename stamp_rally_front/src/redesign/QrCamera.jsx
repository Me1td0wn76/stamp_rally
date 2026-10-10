import { useEffect, useRef, useState } from 'react';
import { createQrDecoder } from './qrDecoder.js';
import { Icon } from './parts.jsx';

// カメラで QR コードを読む部分（読み込み画面 Scan.jsx の上半分）。
// 出ている間だけカメラを動かし、消えたら（画面を離れたら）止める。アプリを裏に回したときも止め、戻ってきたらまた動かす
// 読み取った中身(文字)は onRead に渡す。スタンプを送るか・カメラを止めるかは呼び出し側で決める（止めるときはこれを消す）

// 読み取りの間隔(ms)。毎コマ読むと古いスマホで重くなるので、少し間を空ける
const SCAN_INTERVAL_MS = 150;
// 同じ中身を写し続けている間は onRead を呼び直さない。写らなくなってからこの時間(ms)が経てば、また呼ぶ
const SAME_TEXT_MS = 2500;
// 外側(背面)のカメラを使う。無ければ(PC など)あるカメラを使う
const CAMERA = { video: { facingMode: { ideal: 'environment' } }, audio: false };

// カメラを使えなかったときの文（getUserMedia などが投げる例外の name ごと）
function cameraErrorMessage(err) {
  switch (err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'カメラの使用が許可されていません。ブラウザの設定でカメラを許可してから、もう一度試してください';
    case 'NotFoundError':
    case 'OverconstrainedError':
    case 'NoCameraError':
      return 'カメラが見つかりませんでした';
    case 'NotReadableError':
    case 'AbortError':
      return 'カメラを起動できませんでした。ほかのアプリでカメラを使っていたら閉じてから、もう一度試してください';
    case 'QrDecoderLoadError':
      return 'QR コードを読む準備ができませんでした。電波のよい場所で、ページを読み込み直してください';
    case 'CameraEndedError':
      return 'カメラが止まりました。もう一度試してください';
    default:
      return 'カメラを起動できませんでした。もう一度試してください';
  }
}

function namedError(name, message) {
  const err = new Error(message);
  err.name = name;
  return err;
}

export default function QrCamera({ onRead }) {
  const videoRef = useRef(null);
  // カメラの映像が出ているか
  const [on, setOn] = useState(false);
  // カメラを使えなかったときの文（空なら問題なし）
  const [error, setError] = useState('');
  // 「もう一度」を押した回数。増えるとカメラを起動し直す
  const [attempt, setAttempt] = useState(0);
  // onRead は描画のたびに作り直されるので、読み取りの繰り返しからは最新のものを呼ぶ
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  useEffect(() => {
    const video = videoRef.current;
    let alive = true; // false: 消えた（「もう一度」で起動し直すときも）
    let starting = false;
    let hides = 0; // 裏に回った回数（起動の途中で裏に回ったかを見るため）
    let stream = null;
    let timer = 0;
    let last = { text: '', at: 0 };

    // カメラを止める。映像も外す（再生が始まる前にカメラだけ止めると、play() が終わらないまま残るため。外すと中断される）
    const stop = () => {
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
      video.srcObject = null;
    };

    const fail = (err) => {
      console.error('カメラ起動失敗:', err);
      stop();
      setOn(false);
      setError(cameraErrorMessage(err));
    };

    // 間を空けながら、映像から QR コードを探し続ける
    const scan = async (decode) => {
      if (!alive || !stream) return;
      let text = null;
      try {
        text = await decode(video);
      } catch {
        // そのコマを読めなかっただけなので、次のコマを読む
      }
      if (!alive || !stream) return;
      if (text) {
        const now = Date.now();
        const isNew = text !== last.text || now - last.at > SAME_TEXT_MS;
        last = { text, at: now };
        if (isNew) onReadRef.current(text);
      }
      timer = setTimeout(() => scan(decode), SCAN_INTERVAL_MS);
    };

    const start = async () => {
      if (starting || stream) return;
      starting = true;
      const hidesAtStart = hides;
      try {
        // カメラが使えない(HTTPS でない・古いブラウザ・アプリ内ブラウザの一部)
        if (!navigator.mediaDevices?.getUserMedia) throw namedError('NoCameraError', 'getUserMedia が使えない');
        // 読み取りの準備（jsQR の読み込み）は、カメラの起動と同時に進める
        const decoding = createQrDecoder();
        decoding.catch(() => {}); // 先にカメラで失敗したときに、未処理のエラーにしない
        const s = await navigator.mediaDevices.getUserMedia(CAMERA);
        // 許可を待っている間に消えた・裏に回ったら、すぐ止める
        if (!alive || document.hidden) {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        // ほかのアプリにカメラを取られたときなど
        s.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (stream === s) fail(namedError('CameraEndedError', 'カメラの映像が止まった'));
        });
        video.srcObject = s;
        await video.play();
        const decode = await decoding;
        if (!alive || stream !== s) return;
        setError('');
        setOn(true);
        scan(decode);
      } catch (err) {
        // 起動の途中で裏に回して止めたための失敗（再生が中断されたなど）は、エラーにしない
        if (alive && hides === hidesAtStart) fail(err);
      } finally {
        starting = false;
      }
      // 起動の途中で裏に回して、もう戻ってきていたら起動し直す
      // （戻ってきたときの start は、起動の途中だったので何もしていない）
      if (alive && hides !== hidesAtStart && !stream && !document.hidden) start();
    };

    // 裏に回ったらカメラを止め、戻ってきたら動かし直す
    // （使えなかったときも、設定でカメラを許可して戻ってきたかもしれないので試し直す）
    const onVisibility = () => {
      if (document.hidden) {
        hides++;
        stop();
        setOn(false);
      } else {
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [attempt]);

  const retry = () => {
    setError('');
    setAttempt((n) => n + 1);
  };

  return (
    <>
      <div className={`rd-qr-view${on ? ' is-on' : ''}`}>
        {/* 映像は読み上げない（読み取りの様子は下の文で伝える） */}
        <video ref={videoRef} className="rd-qr-video" muted playsInline aria-hidden="true" />
        {on ? <span className="rd-qr-line" aria-hidden="true" /> : <Icon name="scan" />}
      </div>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <p className="rd-qr-hint">スマホのカメラアプリで QR コードを読み取って、出てきた URL を開いてもスタンプがもらえます</p>
          <button type="button" className="rd-btn rd-btn--pri" onClick={retry}>もう一度</button>
        </>
      ) : (
        <p>{on ? 'スポットの QR コードを枠の中に写してね' : 'カメラを起動しています…'}</p>
      )}
    </>
  );
}
