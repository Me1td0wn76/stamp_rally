import { useState } from 'react';
import { Title } from '../redesign/parts.jsx';

// 管理画面のログイン
// パスワードはサーバーの環境変数 ADMIN_PASSWORD。合っているかは、親(AdminApp)が管理用 API を呼んで確かめる
// (違ったときは error を付けてこの画面に戻ってくる)
export default function Login({ error, onLogin }) {
  const [password, setPassword] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (password) onLogin(password);
  };

  return (
    <>
      <Title name="管理画面" />
      <form className="rd-box ad-login" onSubmit={submit}>
        <h2>ログイン</h2>
        <p>サーバーに設定した管理用のパスワード(ADMIN_PASSWORD)を入れてください</p>
        {/* パスワード管理ツールが保存・入力しやすいよう、ユーザー名(admin で固定)も置いておく */}
        <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
        <label className="ad-field">
          <span>パスワード</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </label>
        {error && <p className="ad-err" role="alert">{error}</p>}
        <button type="submit" className="rd-btn rd-btn--pri" disabled={!password}>ログイン</button>
      </form>
      <p className="rd-hint">ログインは、このタブを閉じるまで続きます</p>
    </>
  );
}
