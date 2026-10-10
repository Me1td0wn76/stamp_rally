import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import './redesign.css';
import AssistiveTouch from './AssistiveTouch.jsx';
import Guide from './Guide.jsx';
import Bingo from './Bingo.jsx';
import Scan from './Scan.jsx';
import Prize from './Prize.jsx';
import Manual from './Manual.jsx';
import Credits from './Credits.jsx';
import Haunt from './Haunt.jsx';
import Loader from './Loader.jsx';
// 隠しミニゲームは見つけたときに初めて読み込む（ふだんの読み込みを増やさないため）
const WitchGame = lazy(() => import('./WitchGame.jsx'));
import { Night } from './parts.jsx';
import { NETWORK_ERROR, errorMessage } from '../api/errors';

// デザインの作り直し。画面の切り替え・スタート・URL からのスタンプ取得は今の App.jsx と同じ仕組み。
// 見た目は切り絵のかぼちゃ（夜空の上に紙を切って貼ったような画面）。後ろでは星・こうもり・おばけなどが動く。画面の移動はかぼちゃのメニュー（AssistiveTouch）から。
// 遊び方は図入りのスライドで、まだはじめていない人にだけサイトを開いたときに最初に出す（説明の画面などから何度でも開ける）
// はじめている人（ユーザーIDが有効な人）は遊び方を出さずに、そのままビンゴカードを見せる

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
  // 遊び方は、ビンゴ画面でまだはじめていない（401）と分かってから開く
  const [guideOpen, setGuideOpen] = useState(false);
  // 最初にはじめているかを確かめ終わったら解決する（ロード画面はこれも待つ）
  // ロード画面が消えたときに、はじめている人にはビンゴカード、まだの人には遊び方がそのまま見えるようにするため
  const [firstCheck] = useState(() => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
  });
  // サイトを開いたときのロード画面（booting: 表示中 / leaving: 消えていく途中）
  // 文字(フォント)の準備と、はじめているかの確認が終わり、しかも最低 BOOT_MIN_MS 経つまで出す。どちらかが遅くても BOOT_MAX_MS で切り上げる
  const [boot, setBoot] = useState('booting');
  useEffect(() => {
    let alive = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const ready = Promise.all([fontsReady, firstCheck.promise]);
    Promise.all([wait(BOOT_MIN_MS), Promise.race([ready, wait(BOOT_MAX_MS)])]).then(() => {
      if (!alive) return;
      setBoot('leaving');
      setTimeout(() => { if (alive) setBoot('done'); }, BOOT_FADE_MS);
    });
    return () => { alive = false; };
  }, [firstCheck]);
  // まだ送っていないスポットのトークン（未スタートならスタート後に送る）
  const [pendingSpotToken, setPendingSpotToken] = useState(initialSpotToken);
  // スタート処理中かどうか(二重送信防止用)
  // state だと再レンダー前の連打で両方が false を読んでしまうため、即座に反映される ref を使う
  const startingRef = useRef(false);
  // スタートに失敗したときに遊び方の最後のページに出す文（失敗していなければ空）
  const [startError, setStartError] = useState('');

  // 画面遷移用の関数
  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  // 読み込み画面で QR コード・NFC タグを読んだが、未スタート(401)だったとき
  // URL から開いたときと同じく、トークンを預かってビンゴ画面へ移る（スタートしたらビンゴ画面が送る）
  const handleScanNotStarted = (token) => {
    setPendingSpotToken(token);
    navigate('bingo');
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
    setStartError('');
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

  // ビンゴ画面がはじめているかを確かめるたびに呼ばれる（true: はじめている / false: まだ(401) / null: 確認に失敗）
  // 最初に分かったときだけ、まだなら遊び方を出す。はじめている人は遊び方を出さずにビンゴカードのまま
  // （サーバーの再起動でユーザーが消えると、Cookie が残っていても 401 になるので、遊び方からやり直してもらう）
  // 確認に失敗したときは決めずにおき、再読み込みで分かったときに決める
  const guideDecidedRef = useRef(false);
  const handleStartedChecked = useCallback((started) => {
    firstCheck.resolve();
    if (started === null || guideDecidedRef.current) return;
    guideDecidedRef.current = true;
    if (!started) setGuideOpen(true);
  }, [firstCheck]);

  // 遊び方の「はじめる」押下時の処理
  // サーバーがユーザーIDを HttpOnly Cookie で発行する(発行済みならそのまま使われる)
  // 成功したらビンゴ画面へ遷移して true を返す。失敗したら遊び方の最後のページに理由を出して false を返す
  const startRally = async () => {
    if (startingRef.current) return false;
    startingRef.current = true;
    setStartError('');
    // 通信できなかったときは NETWORK_ERROR のまま
    let status = NETWORK_ERROR;
    try {
      const res = await fetch('/api/users', { method: 'POST' });
      status = res.status;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '不明なエラー');
      }
      navigate('bingo');
      return true;
    } catch (err) {
      console.error('スタート失敗:', err);
      setStartError(errorMessage(status));
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
              onChecked={handleStartedChecked}
              navigate={navigate}
              openGuide={openGuide}
              pendingSpotToken={pendingSpotToken}
              clearPendingSpotToken={() => setPendingSpotToken(null)}
            />
          )}
          {currentScreen === 'scan' && <Scan navigate={navigate} onNotStarted={handleScanNotStarted} />}
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
        {guideOpen && boot !== 'booting' && <Guide onClose={closeGuide} onStart={startFromGuide} startError={startError} closable={!guideFirst} />}
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
