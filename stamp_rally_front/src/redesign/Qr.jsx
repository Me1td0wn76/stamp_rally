import { Title } from './parts.jsx';

// QR 読み込み（今の画面と同じく見本。読み取りの処理はない）
const Qr = ({ navigate }) => {
  return (
    <>
      <Title name="QR読み込み" back={{ label: '戻る', onClick: () => navigate('home') }} />
      <section className="rd-qr">
        <div className="rd-qr-frame" aria-hidden="true">
          <div className="rd-qr-mock">
            <div className="rd-qr-px"></div><div className="rd-qr-px"></div><div></div><div className="rd-qr-px"></div><div className="rd-qr-px"></div>
            <div className="rd-qr-px"></div><div></div><div className="rd-qr-px"></div><div></div><div className="rd-qr-px"></div>
            <div></div><div className="rd-qr-px"></div><div className="rd-qr-px"></div><div className="rd-qr-px"></div><div></div>
            <div className="rd-qr-px"></div><div></div><div className="rd-qr-px"></div><div></div><div className="rd-qr-px"></div>
            <div className="rd-qr-px"></div><div className="rd-qr-px"></div><div></div><div className="rd-qr-px"></div><div className="rd-qr-px"></div>
          </div>
          <div className="rd-qr-line"></div>
        </div>
        <p>枠内にQRを合わせてね！</p>
      </section>
      <section className="rd-box">
        <p>各会場のQRコードをスキャンするとスタンプがもらえます！</p>
      </section>
      <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>← ビンゴに戻る</button>
    </>
  );
};

export default Qr;
