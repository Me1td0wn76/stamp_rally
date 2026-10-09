const Prize = ({ navigate, currentScreen }) => {
  return (
    <div className="screen">
      <div className="status-bar"><span>STAMP RALLY</span><span>●●●</span></div>
      <div className="nav-bar" style={{ background: '#FF2D8B' }}>
        <div className="nav-back clickable" style={{ color: '#FFD900' }} onClick={() => navigate('bingo')}>‹ 戻る</div>
        <div className="nav-title" style={{ color: '#FFF' }}>景品</div>
        <div style={{ width: '36px' }}></div>
      </div>
      <div style={{ background: '#FAFAFA', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="prize-hero">
          <div className="prize-icon-circle">
            <svg className="prize-icon-svg" viewBox="0 0 24 24">
              <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 12 9 12 9" /><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 12 9 12 9" />
              <path d="M12 9v13" /><path d="M3 9h18v4a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          <div className="prize-hero-h2">景品交換場所</div>
          <div className="prize-hero-p">ビンゴ達成おめでとう！</div>
        </div>
        <div className="stripe"></div>
        <div className="venue-card">
          <div className="venue-sub-label">📍 受取場所</div>
          <div className="venue-name">402教室に<br />来てください</div>
          <div className="venue-hint-box">
            <svg className="hint-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            スタッフにこの画面を見せてね
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="big-btn outline clickable" onClick={() => navigate('bingo')}>← 戻る</div>
      </div>
    </div>
  );
};

export default Prize;