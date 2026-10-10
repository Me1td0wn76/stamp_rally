import { NETWORK_ERROR, errorMessage } from './errors';

// スタンプ取得APIの呼び出し(NFC・QR共通)
// kind: 'qr'(body: { qr_token }) / 'nfc'(body: { nfc_uid }。タグの UID で取る方式。今の画面では使わない)
// NFCタグ・QRコードの URL から開いたときも、読み込み画面(redesign/Scan.jsx)で読んだときも 'qr' で URL のトークンを送る
// 結果は { status, message } で返す。201(取得)・401(未スタート)のときの処理は呼び出し側で行う
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
      return { status: 201, message: 'スタンプを取得しました！' };
    case 401:
      return { status: 401, message: '' };
    case 404:
      return { status: 404, message: '登録されていないタグ・QRコードです' };
    case 409:
      return { status: 409, message: 'このスポットはすでにスタンプ済みです' };
    default:
      console.error(`スタンプ取得失敗(${res.status}):`, data.error ?? '不明なエラー');
      return { status: res.status, message: errorMessage(res.status) };
  }
}
