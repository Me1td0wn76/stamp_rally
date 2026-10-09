import { NETWORK_ERROR } from './errors';

// 管理用 API(/api/admin/...)の呼び出し
// パスワードは Basic 認証のヘッダーで送る(ユーザー名は admin で固定。サーバーの Controller/admin.go と同じ)
// X-Admin-Client を付けると、パスワードが違うときにブラウザのログインダイアログが出ない(画面のログインフォームで知らせる)
const ADMIN_USER = 'admin';

// Basic 認証の値。btoa は ASCII しか扱えないので、UTF-8 のバイト列にしてから base64 にする
function basicAuth(password) {
  const bytes = new TextEncoder().encode(`${ADMIN_USER}:${password}`);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return 'Basic ' + btoa(binary);
}

// path: 'summary' / 'staff-stamps' / 'links'
// 結果は { status, data }。通信できなかったときは status が NETWORK_ERROR、data は null
export async function adminGet(path, password) {
  let res;
  try {
    res = await fetch(`/api/admin/${path}`, {
      headers: { Authorization: basicAuth(password), 'X-Admin-Client': 'dashboard' },
      cache: 'no-store',
    });
  } catch (err) {
    console.error(`管理用 API(${path})の通信失敗:`, err);
    return { status: NETWORK_ERROR, data: null };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) console.error(`管理用 API(${path})の失敗(${res.status}):`, data?.error ?? '不明なエラー');
  return { status: res.status, data };
}
