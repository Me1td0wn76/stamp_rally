import { NETWORK_ERROR, errorMessage } from './errors';

// スタンプ取得APIの呼び出し(NFC・QR共通)
// kind: 'qr'(body: { qr_token }) / 'nfc'(body: { nfc_uid }。タグの UID で取る方式。今の画面では使わない)
// NFCタグ・QRコードの URL から開いたときも、読み込み画面(redesign/Scan.jsx)で読んだときも 'qr' で URL のトークンを送る
// 結果は { status, message } で返す。201(取得)・401(未スタート)のときの処理は呼び出し側で行う
// 201 のときは secret も返す（特別室を開くスタッフのスタンプのときだけ { room, no, staff, stamp_image, stamps }。それ以外は null）
// 409（取得済み）でも、特別室のカギを持っている人がそのスタッフの QR・NFC をもう一度読んだときは secret が返る（もう一度入れる）
export async function postStamp(kind, body) {
  let res;
  try {
    res = await fetch(`/api/stamps/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('スタンプ取得の通信失敗:', err);
    return { status: NETWORK_ERROR, message: errorMessage(NETWORK_ERROR) };
  }
  const data = await res.json().catch(() => ({}));
  switch (res.status) {
    case 201:
      return { status: 201, message: 'スタンプを取得しました！', secret: data.secret ?? null };
    case 401:
      return { status: 401, message: '' };
    case 404:
      return { status: 404, message: '登録されていないタグ・QRコードです' };
    case 409:
      return { status: 409, message: 'このスポットはすでにスタンプ済みです', secret: data.secret ?? null };
    default:
      console.error(`スタンプ取得失敗(${res.status}):`, data.error ?? '不明なエラー');
      return { status: res.status, message: errorMessage(res.status) };
  }
}

// 特別室に入った記録（secret と同じ中身）をサーバーから取り直す（GET /api/special-room）
// 端末に記録が残っていないときに、ビンゴ画面などから入り直すのに使う。カギを持っていない・取れなかったときは null
export async function getSpecialRoom() {
  try {
    const res = await fetch('/api/special-room');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('特別室の記録の取得失敗:', err);
    return null;
  }
}
