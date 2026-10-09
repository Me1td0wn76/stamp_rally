import { Title } from './parts.jsx';

// QR 読み込み（今の画面と同じく見本。読み取りの処理はない）
// QRコードにはアプリの URL(?spot=<トークン>)が入っているので、標準のカメラアプリで読めば開ける
const Qr = ({ navigate }) => {
  return (
    <>
      <Title name="QR読み込み" back={{ label: '戻る', onClick: () => navigate('bingo') }} />
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
        <p>スマホのカメラアプリで<br />会場のQRを読み取ってね！</p>
      </section>
      <section className="rd-box">
        <p>読み取ったURLを開くとスタンプがもらえます！NFCタグはスマホを近づけて、出てきた通知をタップしてね</p>
      </section>
      <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>← ビンゴに戻る</button>
    </>
  );
};

export default Qr;
