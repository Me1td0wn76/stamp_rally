import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import '../redesign/redesign.css';
import './admin.css';
import { Night, Title } from '../redesign/parts.jsx';
import Loader from '../redesign/Loader.jsx';
import LoadError from '../redesign/LoadError.jsx';
import { adminGet } from '../api/admin';
import { adminErrorMessage, fmtDateTime, fmtTime } from './format.js';
import Login from './Login.jsx';
import Overview from './Overview.jsx';
import Codeflow from './Codeflow.jsx';
import Spots from './Spots.jsx';
import Links from './Links.jsx';

// 管理画面(/admin)。見た目は来場者画面(redesign)の夜空・切った紙をそのまま使う
// 来場者の画面(かぼちゃのメニューなど)からはリンクしない。URL を知っていても、パスワードが無ければデータは見られない
//
// - ログイン:パスワードを管理用 API に Basic 認証で送り、通ったらこのタブを閉じるまで sessionStorage に覚えておく
// - データ:概要(/api/admin/summary)と CodeFlow の記録(/api/admin/staff-stamps)をまとめて取る。QR・URL のタブは開いたときに取る
// - 更新:「更新」ボタンと、30 秒ごとの自動更新(画面が見えている間だけ。ON/OFF は localStorage に覚えておく)
// - サーバーの再起動(起動時刻が変わったこと)に気づいたら知らせる(記録はメモリ上にあり、再起動で消えるため)
// 管理画面のファイルは来場者が開かないので、main.jsx で /admin を開いたときにだけ読み込む

const PASSWORD_KEY = 'rd.adminPassword';
const AUTO_KEY = 'rd.adminAuto';
const AUTO_MS = 30_000;

const TABS = [
  { to: '/admin', label: '概要', end: true },
  { to: '/admin/codeflow', label: 'CodeFlow' },
  { to: '/admin/spots', label: 'スポット' },
  { to: '/admin/links', label: 'QR・URL' },
];

// プライベートブラウズなどでは storage が使えない(例外になる)ことがあるので、使えなくても動くようにする
function readStorage(kind, key) {
  try { return window[kind].getItem(key); } catch { return null; }
}
function writeStorage(kind, key, value) {
  try {
    if (value === null) window[kind].removeItem(key);
    else window[kind].setItem(key, value);
  } catch { /* 覚えておけないだけ(開き直すとログインし直し・自動更新は ON に戻る) */ }
}

// 概要(summary)と CodeFlow の記録(staff-stamps)をまとめて取る
// 結果は { status: 200, summary, staff }。どちらかが失敗したら { status: 失敗したほうのステータス }
async function fetchDashboard(password) {
  const [summary, staff] = await Promise.all([adminGet('summary', password), adminGet('staff-stamps', password)]);
  const failed = [summary, staff].find((r) => r.status !== 200);
  return failed ? { status: failed.status } : { status: 200, summary: summary.data, staff: staff.data };
}

export default function AdminApp() {
  // ログイン中のパスワード(null: ログインしていない)
  const [password, setPassword] = useState(() => readStorage('sessionStorage', PASSWORD_KEY));
  // 取り終わったときに、まだ同じパスワードでログインしているかを確かめる用(ログイン・ログアウトのときに書きかえる)
  const passwordRef = useRef(password);
  // ログイン画面に出す文(パスワード違い・管理用 API が無効など)
  const [loginError, setLoginError] = useState('');
  // { summary, staff }(まだ取れていなければ null)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // 最後の更新に失敗したときの文(前の結果は残して表示する)
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  // サーバーが再起動されたことに気づいたときの、新しい起動時刻
  const [restartedAt, setRestartedAt] = useState(null);
  const [auto, setAuto] = useState(() => readStorage('localStorage', AUTO_KEY) !== 'off');
  const startedAtRef = useRef(null);
  // 取得中に自動更新が重なって二重に取らないようにする(state だと次の描画まで反映されないので ref)
  const inFlightRef = useRef(false);

  useEffect(() => {
    const prev = document.title;
    document.title = '管理画面';
    return () => { document.title = prev; };
  }, []);

  const logout = useCallback((message = '') => {
    writeStorage('sessionStorage', PASSWORD_KEY, null);
    passwordRef.current = null;
    startedAtRef.current = null;
    setPassword(null);
    setData(null);
    setError('');
    setRestartedAt(null);
    setLoginError(message);
  }, []);

  // パスワード違い(401)・管理用 API が無効(404)のときは、ログイン画面に戻して理由を出す
  const handleAuthError = useCallback((status) => logout(adminErrorMessage(status)), [logout]);

  // 取った結果を画面に出す
  // 取っている間にログアウト・ログインし直したときは、古いパスワードで取った結果なので捨てる
  const applyResult = useCallback((result, pw) => {
    if (pw !== passwordRef.current) return;
    setLoading(false);
    if (result.status !== 200) {
      if (result.status === 401 || result.status === 404) handleAuthError(result.status);
      else setError(adminErrorMessage(result.status));
      return;
    }
    writeStorage('sessionStorage', PASSWORD_KEY, pw);
    const started = result.summary.started_at;
    if (startedAtRef.current && startedAtRef.current !== started) setRestartedAt(started);
    startedAtRef.current = started;
    setData({ summary: result.summary, staff: result.staff });
    setError('');
    setUpdatedAt(new Date());
  }, [handleAuthError]);

  // 開いたとき(覚えているパスワードがあれば)と、ログインしたときに取る
  useEffect(() => {
    if (password === null) return;
    let alive = true;
    inFlightRef.current = true;
    (async () => {
      const result = await fetchDashboard(password);
      inFlightRef.current = false;
      if (alive) applyResult(result, password);
    })();
    return () => { alive = false; };
  }, [password, applyResult]);

  // 取り直す(「更新」ボタン・自動更新)。前の結果は残したまま、少し薄くして待つ
  const refresh = useCallback(async () => {
    if (password === null || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    const result = await fetchDashboard(password);
    inFlightRef.current = false;
    applyResult(result, password);
  }, [password, applyResult]);

  // 自動更新:画面が見えている間だけ AUTO_MS ごとに取り直す。別のタブから戻ってきたときもすぐ取り直す
  useEffect(() => {
    if (password === null || !auto) return;
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const id = setInterval(tick, AUTO_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [password, auto, refresh]);

  // パスワードが合っているかは、そのパスワードで取ってみて確かめる(違えば 401 でログイン画面に戻る)
  const login = (pw) => {
    passwordRef.current = pw;
    setLoginError('');
    setPassword(pw);
  };
  const toggleAuto = () => {
    const next = !auto;
    setAuto(next);
    writeStorage('localStorage', AUTO_KEY, next ? 'on' : 'off');
  };

  return (
    <div className="rd ad">
      <div className="rd-frame">
        <Night />
        <main className="rd-scroll">
          {password === null ? (
            <Login key={loginError} error={loginError} onLogin={login} />
          ) : (
            <>
              <div className="ad-noprint">
                <Title name="管理画面" />
              </div>
              <div className="ad-bar ad-noprint">
                <p className="ad-bar-status" role="status">
                  {loading ? '読み込み中…' : updatedAt ? `最終更新 ${fmtTime(updatedAt)}` : ''}
                  {auto && '・30秒ごとに自動更新'}
                </p>
                <button type="button" className="rd-btn ad-btn-small" onClick={refresh} disabled={loading}>更新 ↻</button>
                <button type="button" className="rd-btn rd-btn--line ad-btn-small" aria-pressed={auto} onClick={toggleAuto}>
                  自動更新 {auto ? 'ON' : 'OFF'}
                </button>
                <button type="button" className="rd-btn rd-btn--line ad-btn-small" onClick={() => logout()}>ログアウト</button>
              </div>

              {restartedAt && (
                <div className="rd-msg ad-notice ad-noprint" role="status">
                  <span>サーバーが再起動されました({fmtDateTime(restartedAt)})。それより前の記録は消えています</span>
                  <button type="button" className="ad-notice-close" onClick={() => setRestartedAt(null)} aria-label="閉じる">×</button>
                </div>
              )}
              {error && data && (
                <p className="rd-msg ad-noprint" role="alert">更新できませんでした:{error}(前の結果を出しています)</p>
              )}

              <nav className="ad-tabs ad-noprint" aria-label="管理画面のページ">
                {TABS.map((tab) => (
                  <NavLink key={tab.to} to={tab.to} end={tab.end} className="ad-tab">{tab.label}</NavLink>
                ))}
              </nav>

              {data ? (
                <div className={`ad-body${loading ? ' is-loading' : ''}`}>
                  <Routes>
                    <Route index element={<Overview summary={data.summary} />} />
                    <Route path="codeflow" element={<Codeflow staff={data.staff} />} />
                    <Route path="spots" element={<Spots summary={data.summary} />} />
                    <Route path="links" element={<Links password={password} onAuthError={handleAuthError} />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </div>
              ) : error ? (
                <>
                  <LoadError message={error} />
                  <button type="button" className="rd-btn rd-btn--big" onClick={() => { setError(''); refresh(); }}>再読み込み ↻</button>
                </>
              ) : (
                <Loader />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
