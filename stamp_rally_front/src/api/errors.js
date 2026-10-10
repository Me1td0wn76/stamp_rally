// API の失敗を、画面に出す文に変える(スタート・ビンゴ状況の取得・スタンプ取得で共通)
// サーバーが返すエラー文(英語)や例外の文はそのまま画面に出さず、調べるときのために console.error にだけ残す

// 通信できなかった(電波がない・サーバーに届かない)ときの status
export const NETWORK_ERROR = 0;

// status: HTTPステータス(通信できなかったときは NETWORK_ERROR)
export function errorMessage(status) {
  if (status === NETWORK_ERROR) return '通信できませんでした。電波のよい場所で、もう一度試してください';
  // 503 はユーザー数が上限に達したとき
  if (status === 503) return '混み合っています。少し待ってから、もう一度試してください';
  if (status >= 500) return 'サーバーで問題が起きました。少し待ってから、もう一度試してください';
  return 'うまくいきませんでした。もう一度試してください';
}
