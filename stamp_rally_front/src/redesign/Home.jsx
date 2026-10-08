import { Icon, Title } from './parts.jsx';

// ホーム。文言は今の画面（components/Home.jsx）と同じ
const Home = ({ navigate, openGuide }) => {
  return (
    <>
      <Title name="ホーム" />
      <section className="rd-box rd-box--lead">
        <span className="rd-tag">スタンプラリー開催中！</span>
        <h2>集めてビンゴ達成！</h2>
        <p>スタンプを全部集めて特別景品をゲットしよう</p>
        <span className="rd-tag">景品あり</span>
      </section>
      <div className="rd-menu">
        <button type="button" className="rd-btn rd-btn--wide" onClick={() => navigate('nfc')}><Icon name="nfc" />NFC読み込み</button>
        <button type="button" className="rd-btn" onClick={() => navigate('bingo')}><Icon name="bingo" />ビンゴカード</button>
        <button type="button" className="rd-btn" onClick={() => navigate('qr')}><Icon name="qr" />QR読み込み</button>
        <button type="button" className="rd-btn" onClick={() => navigate('prize')}><Icon name="prize" />景品確認</button>
        <button type="button" className="rd-btn" onClick={openGuide}><Icon name="manual" />遊び方</button>
      </div>
      <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('bingo')}>スタート →</button>
    </>
  );
};

export default Home;
