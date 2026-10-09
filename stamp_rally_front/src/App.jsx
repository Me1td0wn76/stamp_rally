import { useState } from 'react';
import './App.css';
import Home from "./components/Home";
import Bingo from "./components/Bingo";
import Qr from "./components/Qr";
import Prize from "./components/Prize";
import Manual from "./components/Manual";

// ユーザーIDを保存する localStorage のキー
const USER_ID_KEY = 'stamp_rally_user_id';

// localStorage はプライベートモード等で使えない場合があるため try/catch で囲む
const loadUserId = () => {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
};

const saveUserId = (userId) => {
  try {
    localStorage.setItem(USER_ID_KEY, userId);
  } catch {
    // 保存できなくても、このセッション中は state で保持される
  }
};

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [userId, setUserId] = useState(loadUserId);
  const [starting, setStarting] = useState(false);

  // 画面遷移用の関数
  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  // スタートボタン押下時の処理
  // ユーザーIDが未発行ならAPIで発行して保存し、ビンゴ画面へ遷移する
  const startRally = async () => {
    if (userId) {
      navigate('bingo');
      return;
    }
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch('/api/users', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.user_id) {
        throw new Error(data.error ?? '不明なエラー');
      }
      saveUserId(data.user_id);
      setUserId(data.user_id);
      navigate('bingo');
    } catch (err) {
      alert('スタートに失敗しました: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="phone">
      {currentScreen === 'home' && <Home navigate={navigate} currentScreen={currentScreen} startRally={startRally} />}
      {currentScreen === 'bingo' && <Bingo navigate={navigate} currentScreen={currentScreen} userId={userId} startRally={startRally} />}
      {currentScreen === 'qr' && <Qr navigate={navigate} currentScreen={currentScreen} />}
      {currentScreen === 'prize' && <Prize navigate={navigate} currentScreen={currentScreen} />}
      {currentScreen === 'manual' && <Manual navigate={navigate} currentScreen={currentScreen} />}
      <div className="tab-bar">
        <div className={`tab-item clickable ${currentScreen === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          ホーム
        </div>
        <div className={`tab-item clickable ${currentScreen === 'bingo' ? 'active' : ''}`} onClick={() => navigate('bingo')}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          ビンゴ
        </div>
        <div className={`tab-item clickable ${currentScreen === 'qr' ? 'active' : ''}`} onClick={() => navigate('qr')}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01" />
          </svg>
          QR
        </div>
        <div className={`tab-item clickable ${currentScreen === 'prize' ? 'active' : ''}`} onClick={() => navigate('prize')}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
          </svg>
          景品
        </div>
        <div className={`tab-item clickable ${currentScreen === 'manual' ? 'active' : ''}`} onClick={() => navigate('manual')}>
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          遊び方
        </div>
      </div>
    </div>
  );
}

export default App;