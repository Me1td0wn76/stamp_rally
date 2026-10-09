import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import './redesign.css';
import AssistiveTouch from './AssistiveTouch.jsx';
import Guide from './Guide.jsx';
import Bingo from './Bingo.jsx';
import Nfc from './Nfc.jsx';
import Qr from './Qr.jsx';
import Prize from './Prize.jsx';
import Manual from './Manual.jsx';
import Credits from './Credits.jsx';
import Haunt from './Haunt.jsx';
import Loader from './Loader.jsx';
// 隠しミニゲームは見つけたときに初めて読み込む（ふだんの読み込みを増やさないため）
const WitchGame = lazy(() => import('./WitchGame.jsx'));
import { Night } from './parts.jsx';

// デザインの作り直し。画面の切り替え・スタート・URL からのスタンプ取得は今の App.jsx と同じ仕組み。
// 見た目は切り絵のかぼちゃ（夜空の上に紙を切って貼ったような画面）。後ろでは星・こうもり・おばけなどが動く。画面の移動はかぼちゃのメニュー（AssistiveTouch）から。
// 遊び方は図入りのスライドで、サイトを開くたびに最初に出す（説明の画面などから何度でも開ける）

// NFCタグ・QRコードには https://<ドメイン>/?spot=<トークン> のURLが入っている
// (iPhone はページから NFC を読めないが、タグに書かれた URL は OS が読み取って開いてくれる)
// URL からトークンを取り出し、再読み込みで二重に送らないよう URL からは消しておく
// StrictMode ではコンポーネント内の初期化処理が2回呼ばれ、2回目は消した後の URL を読んでしまうため、モジュール読み込み時に1度だけ行う
function takeSpotTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('spot');
  if (token === null) return null;
  url.searchParams.delete('spot');
  window.history.replaceState(null, '', url);
  return token || null;
}
const initialSpotToken = takeSpotTokenFromUrl();

// サイトを開いたときのロード画面：最低表示時間・最長待ち時間・消えるまでの時間(ms)
const BOOT_MIN_MS = 1000;
const BOOT_MAX_MS = 4000;
const BOOT_FADE_MS = 350;

function RedesignApp() {
  // 起動時はビンゴ画面（今の App.jsx と同じ）
  const [currentScreen, setCurrentScreen] = useState('bingo');
  const [guideOpen, setGuideOpen] = useState(true);
  // サイトを開いたときのロード画面（booting: 表示中 / leaving: 消えていく途中）
  // 文字(フォント)の準備ができ、しかも最低 BOOT_MIN_MS 経つまで出す。フォントが遅くても BOOT_MAX_MS で切り上げる
  const [boot, setBoot] = useState('booting');
  useEffect(() => {
    let alive = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([wait(BOOT_MIN_MS), Promise.race([fontsReady, wait(BOOT_MAX_MS)])]).then(() => {
      if (!alive) return;
      setBoot('leaving');
      setTimeout(() => { if (alive) setBoot('done'); }, BOOT_FADE_MS);
    });
    return () => { alive = false; };
  }, []);
  // まだ送っていないスポットのトークン（未スタートならスタート後に送る）
  const [pendingSpotToken, setPendingSpotToken] = useState(initialSpotToken);
  // スタート処理中かどうか(二重送信防止用)
  // state だと再レンダー前の連打で両方が false を読んでしまうため、即座に反映される ref を使う
  const startingRef = useRef(false);

  // 画面遷移用の関数
  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  // 隠しミニゲーム（かぼちゃのメニューを10回続けて押すと出る）
  const [secretOpen, setSecretOpen] = useState(false);
  const leaveSecret = () => {
    setSecretOpen(false);
    navigate('bingo');
  };

  // 最初に開いたときの遊び方は「閉じる」なし（最後の「はじめる」でIDを発行して始める）
  // あとから「説明」などで開き直したときは「閉じる」で閉じられる
  const [guideFirst, setGuideFirst] = useState(true);
  const openGuide = () => {
    setGuideFirst(false);
    setGuideOpen(true);
  };
  // スタートしたら、ビンゴ画面にビンゴ状況を取り直してもらう
  // （画面を作り直すと、遊び方の後ろで出ていたスタンプ取得のメッセージまで消えてしまうので、取り直しの合図だけ送る）
  const [bingoReload, setBingoReload] = useState(0);
  const startFromGuide = async () => {
    const ok = await startRally();
    if (ok) setBingoReload((n) => n + 1);
    return ok;
  };
  const closeGuide = () => {
    setGuideOpen(false);
  };

  // 遊び方の「はじめる」押下時の処理
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
      alert('はじめられませんでした: ' + err.message);
      return false;
    } finally {
      startingRef.current = false;
    }
  };

  return (
    <div className="rd">
      <div className="rd-frame">
        <Night />
        {/* 説明画面では黒猫をつかんで上に引っぱると、開発者紹介（隠し画面）へ */}
        <Haunt catchable={currentScreen === 'manual' && !guideOpen} onCatch={() => navigate('credits')} />
        <main className="rd-scroll" key={currentScreen}>
          {currentScreen === 'bingo' && (
            <Bingo
              reloadSignal={bingoReload}
              navigate={navigate}
              openGuide={openGuide}
              pendingSpotToken={pendingSpotToken}
              clearPendingSpotToken={() => setPendingSpotToken(null)}
            />
          )}
          {currentScreen === 'nfc' && <Nfc navigate={navigate} />}
          {currentScreen === 'qr' && <Qr navigate={navigate} />}
          {currentScreen === 'prize' && <Prize navigate={navigate} />}
          {currentScreen === 'manual' && <Manual navigate={navigate} openGuide={openGuide} />}
          {currentScreen === 'credits' && <Credits navigate={navigate} />}
        </main>
        <AssistiveTouch page={currentScreen} onGo={navigate} hideTip={guideOpen || boot !== 'done'} onSecret={() => setSecretOpen(true)} />
        {secretOpen && (
          <Suspense fallback={<div className="rd-wg rd-wg--loading"><Loader size="full" /></div>}>
            <WitchGame onBack={leaveSecret} />
          </Suspense>
        )}
        {/* 遊び方はロード画面が消え始めてから出す（カードが出てくる動きを見せるため） */}
        {guideOpen && boot !== 'booting' && <Guide onClose={closeGuide} onStart={startFromGuide} closable={!guideFirst} />}
        {boot !== 'done' && (
          <div className={`rd-boot${boot === 'leaving' ? ' is-leaving' : ''}`}>
            <Loader size="full" />
          </div>
        )}
      </div>
    </div>
  );
}

export default RedesignApp;
