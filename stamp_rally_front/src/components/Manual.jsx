const Manual = ({ navigate, currentScreen }) => {
  return (
    <div className="screen">
      <div className="status-bar"><span>STAMP RALLY</span><span>●●●</span></div>
      <div className="nav-bar" style={{ background: '#00C060' }}>
        <div className="nav-back clickable" style={{ color: '#FFD900' }} onClick={() => navigate('bingo')}>‹ ビンゴ</div>
        <div className="nav-title" style={{ color: '#FFF' }}>遊び方</div>
        <div style={{ width: '36px' }}></div>
      </div>
      <div className="explain-body">
        <div className="step-card">
          <div className="step-num s1">1</div>
          <div>
            <div className="step-title">スタートする</div>
            <div className="step-desc">ビンゴ画面の「スタート」を押してビンゴカードを受け取ろう！</div>
          </div>
        </div>
        <div className="step-card">
          <div className="step-num s2">2</div>
          <div>
            <div className="step-title">QRを読み取る</div>
            <div className="step-desc">各会場のQRをスキャンしてスタンプをゲット！</div>
          </div>
        </div>
        <div className="step-card">
          <div className="step-num s3">3</div>
          <div>
            <div className="step-title">ビンゴを目指す</div>
            <div className="step-desc">縦・横・斜めが揃ったらビンゴ達成！</div>
          </div>
        </div>
        <div className="step-card">
          <div className="step-num s4">4</div>
          <div>
            <div className="step-title">景品を受け取る</div>
            <div className="step-desc">景品画面をスタッフに見せよう！</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Manual;