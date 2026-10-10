import { useRef, useState } from 'react';
import { postStamp } from '../api/stamps';
import { Icon, Title } from './parts.jsx';
import QrCamera from './QrCamera.jsx';
import NfcReader from './NfcReader.jsx';

// 読み込み。アプリの中で QR コード（カメラ）と NFC タグ（Android の Chrome だけ）を読んで、その場でスタンプをもらう画面
// QR コードにも NFC タグにも https://<ドメイン>/?spot=<トークン> の URL が入っているので、どちらもトークンを取り出して
// POST /api/stamps/qr に送る（カメラアプリ・OS の通知から URL を開いたときと同じ API）
// QR は読み取ったらカメラを止める（同じ QR を写し続けても何度も送らない）。「続けて読む」でまた動かす
// NFC はタグをかざすたびに読む

// このスタンプラリーの QR コード・NFC タグでなかったときの文
const NOT_OURS_QR = 'スタンプラリーの QR コードではありません。スポットにある QR コードを写してください';
const NOT_OURS_NFC = 'スタンプラリーの NFC タグではありません。スポットにある NFC タグにかざしてください';

// 読み取った文字(QR コード・NFC タグの URL)から、スポットのトークン(?spot=<トークン>)を取り出す
// URL でない・http(s) でない・spot が無いときは null（このスタンプラリーのものではない）
// ドメインは確かめない（本番と手元の環境でドメインがちがっても試せるように。知らないトークンはサーバーが 404 を返す）
function spotTokenFrom(text) {
  let url;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.searchParams.get('spot') || null;
}

// onNotStarted: 未スタート(401)だったときに、読んだトークンを渡して呼ぶ（親はトークンを預かってビンゴ画面へ移る）
const Scan = ({ navigate, onNotStarted }) => {
  const [message, setMessage] = useState('');
  const [acquired, setAcquired] = useState(false);
  // カメラで QR コードを読んでいるか
  const [cameraOn, setCameraOn] = useState(true);
  // スタンプを送っている間は、次に読んだものを送らない
  // state だと続けて読んだときに反映が間に合わないため、即座に反映される ref を使う
  const sendingRef = useRef(false);

  // スポットのトークンを送ってスタンプをもらう（QR・NFC 共通）
  // 未スタート(401)のときは、トークンを親に預けてビンゴ画面へ移る（画面を離れるのでカメラ・NFC も止まる）
  // ビンゴ画面で「はじめる」を押すと、預けたトークンでスタンプが付く（URL から開いたときと同じ）
  const sendToken = async (token) => {
    sendingRef.current = true;
    setMessage('スタンプを送っています…');
    try {
      const { status, message } = await postStamp('qr', { qr_token: token });
      if (status === 401) {
        onNotStarted(token);
        return;
      }
      setMessage(message);
      if (status === 201) setAcquired(true);
    } finally {
      sendingRef.current = false;
    }
  };

  // カメラで QR コードを読んだとき
  // スタンプラリーの QR ならカメラを止めて送る。ちがうときは文を出して、そのまま読み続ける
  const handleQr = (text) => {
    if (sendingRef.current) return;
    const token = spotTokenFrom(text);
    if (!token) {
      setMessage(NOT_OURS_QR);
      return;
    }
    setCameraOn(false);
    sendToken(token);
  };

  // NFC タグを読んだとき（texts: タグのレコードの文字。URL が入っているものを探す）
  const handleNfc = (texts) => {
    if (sendingRef.current) return;
    const token = texts.map(spotTokenFrom).find(Boolean);
    if (!token) {
      setMessage(NOT_OURS_NFC);
      return;
    }
    sendToken(token);
  };

  const restartCamera = () => {
    setMessage('');
    setCameraOn(true);
  };

  return (
    <>
      <Title name="読み込み" back={{ label: 'ビンゴ', onClick: () => navigate('bingo') }} />

      <section className="rd-qr">
        {cameraOn ? (
          <QrCamera onRead={handleQr} />
        ) : (
          <>
            <div className="rd-qr-view" aria-hidden="true"><Icon name="scan" /></div>
            <p>QR コードを読み取りました</p>
            <button type="button" className="rd-btn rd-btn--pri" onClick={restartCamera}>続けて読む</button>
          </>
        )}
      </section>

      {message && <p className="rd-msg" role="status">{message}</p>}
      {acquired && <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('bingo')}>ビンゴを見る</button>}

      <NfcReader onRead={handleNfc} />
    </>
  );
};

export default Scan;
