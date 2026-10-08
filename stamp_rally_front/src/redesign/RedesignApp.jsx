import { useState } from 'react';
import './redesign.css';
import AssistiveTouch from './AssistiveTouch.jsx';
import Guide from './Guide.jsx';
import Home from './Home.jsx';
import Bingo from './Bingo.jsx';
import Nfc from './Nfc.jsx';
import Qr from './Qr.jsx';
import Prize from './Prize.jsx';

// デザインの作り直し（/redesign/*）。画面の切り替えは今の App.jsx と同じ仕組み。
// 見た目は構成 v1（灰色の骨組み）。画面の移動は白丸（AssistiveTouch）から。
// 遊び方は図入りのスライドで、初めて開いたときに自動で出す（ホームなどから何度でも開ける）

const GUIDE_KEY = 'rd.guideSeen';
function readLS(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeLS(key, v) { try { localStorage.setItem(key, v); } catch { /* 保存できなくても動く */ } }

function RedesignApp() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [guideOpen, setGuideOpen] = useState(() => readLS(GUIDE_KEY) !== '1');

  // 画面遷移用の関数
  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  const openGuide = () => setGuideOpen(true);
  const closeGuide = () => {
    setGuideOpen(false);
    writeLS(GUIDE_KEY, '1');
  };

  return (
    <div className="rd">
      <div className="rd-frame">
        <main className="rd-scroll" key={currentScreen}>
          {currentScreen === 'home' && <Home navigate={navigate} openGuide={openGuide} />}
          {currentScreen === 'bingo' && <Bingo navigate={navigate} openGuide={openGuide} />}
          {currentScreen === 'nfc' && <Nfc navigate={navigate} />}
          {currentScreen === 'qr' && <Qr navigate={navigate} />}
          {currentScreen === 'prize' && <Prize navigate={navigate} />}
        </main>
        <AssistiveTouch page={currentScreen} onGo={navigate} hideTip={guideOpen} />
        {guideOpen && <Guide onClose={closeGuide} />}
      </div>
    </div>
  );
}

export default RedesignApp;
