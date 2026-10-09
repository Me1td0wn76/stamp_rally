import { useState, useRef } from 'react';
import './App.css';
import Bingo from "./components/Bingo";
import Qr from "./components/Qr";
import Prize from "./components/Prize";
import Manual from "./components/Manual";

function App() {
  const [currentScreen, setCurrentScreen] = useState('bingo');
  // スタート処理中かどうか(二重送信防止用)
  // state だと再レンダー前の連打で両方が false を読んでしまうため、即座に反映される ref を使う
  const startingRef = useRef(false);

  // 画面遷移用の関数
  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  // スタートボタン押下時の処理
  // サーバーがユーザーIDを HttpOnly Cookie で発行する(発行済みならそのまま使われる)
  // 成功したらビンゴ画面へ遷移して true を返す
  const startRally = async () => {
    if (startingRef.current) return false;
    startingRef.current = true;
    try {
      const res = await fetch('/api/users', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '不明なエラー');
      }
      navigate('bingo');
      return true;
    } catch (err) {
      alert('スタートに失敗しました: ' + err.message);
      return false;
    } finally {
      startingRef.current = false;
    }
  };

  return (
    <div className="phone">
      {currentScreen === 'bingo' && <Bingo navigate={navigate} startRally={startRally} />}
      {currentScreen === 'qr' && <Qr navigate={navigate} currentScreen={currentScreen} />}
      {currentScreen === 'prize' && <Prize navigate={navigate} currentScreen={currentScreen} />}
      {currentScreen === 'manual' && <Manual navigate={navigate} currentScreen={currentScreen} />}
      <div className="tab-bar">
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