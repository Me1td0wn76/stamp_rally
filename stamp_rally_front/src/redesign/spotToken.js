// NFCタグ・QRコードには https://<ドメイン>/?spot=<トークン> のURLが入っている
// (iPhone はページから NFC を読めないが、タグに書かれた URL は OS が読み取って開いてくれる)
// URL からトークンを取り出し、再読み込みで二重に送らないよう URL からは消しておく
// StrictMode ではコンポーネント内の初期化処理が2回呼ばれ、2回目は消した後の URL を読んでしまうため、モジュール読み込み時に1度だけ行う
// RedesignApp(スタンプを送る)と main.jsx(トークンがあれば 404 にせずビンゴ画面を出す)の両方で使うので、ファイルを分けている
function takeSpotTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('spot');
  if (token === null) return null;
  url.searchParams.delete('spot');
  window.history.replaceState(null, '', url);
  return token || null;
}

export const initialSpotToken = takeSpotTokenFromUrl();
