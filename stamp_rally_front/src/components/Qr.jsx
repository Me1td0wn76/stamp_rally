import '../App.css';


const Qr = ({ navigate, currentScreen }) => {
  return (
    <div className="screen">
      <div className="status-bar"><span>STAMP RALLY</span><span>●●●</span></div>
      <div className="nav-bar" style={{ background: '#00D4D4' }}>
        <div className="nav-back clickable" onClick={() => navigate('bingo')}>‹ 戻る</div>
        <div className="nav-title">QR読み込み</div>
        <div style={{ width: '36px' }}></div>
      </div>
      <div style={{ background: '#FAFAFA', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="qr-area">
          <div className="qr-frame">
            <div className="qr-mock">
              <div className="qr-px"></div><div className="qr-px"></div><div></div><div className="qr-px"></div><div className="qr-px"></div>
              <div className="qr-px"></div><div></div><div className="qr-px"></div><div></div><div className="qr-px"></div>
              <div></div><div className="qr-px"></div><div className="qr-px"></div><div className="qr-px"></div><div></div>
              <div className="qr-px"></div><div></div><div className="qr-px"></div><div></div><div className="qr-px"></div>
              <div className="qr-px"></div><div className="qr-px"></div><div></div><div className="qr-px"></div><div className="qr-px"></div>
            </div>
            <div className="scan-line-mock"></div>
          </div>
          {/* QRコードにはアプリの URL(?spot=<トークン>)が入っているので、標準のカメラアプリで読めば開ける */}
          <div className="qr-label">📷 スマホのカメラアプリで<br />会場のQRを読み取ってね！</div>
        </div>
        <div className="info-strip">
          <svg className="info-strip-icon" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="info-strip-text">読み取ったURLを開くとスタンプがもらえます！NFCタグはスマホを近づけて、出てきた通知をタップしてね</div>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="big-btn outline clickable" onClick={() => navigate('bingo')}>← 戻る</div>
      </div>
    </div>
  );
};

export default Qr;