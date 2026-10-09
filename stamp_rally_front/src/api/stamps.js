// スタンプ取得APIの呼び出し(NFC・QR共通)
// kind: 'nfc'(body: { nfc_uid }) / 'qr'(body: { qr_token }。NFCタグ・QRコードのURLから開いたときもこちら)
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
    return { status: 0, message: '通信エラー: ' + err.message };
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
      return { status: res.status, message: 'エラー: ' + (data.error ?? '不明なエラー') };
  }
}
