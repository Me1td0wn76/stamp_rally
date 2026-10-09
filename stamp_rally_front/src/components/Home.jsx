const Home = ({ navigate, currentScreen, startRally }) => {
  return (
    <div className="screen">
      <div className="status-bar"><span>STAMP RALLY</span><span>●●●</span></div>
      <div className="stripe"></div>
      <div className="home-hero">
        <div className="hero-dots-deco"></div>
        <div className="hero-eyebrow">📍 スタンプラリー開催中！</div>
        <div className="hero-h2">集めて<br /><span>ビンゴ</span><br />達成！</div>
        <div className="hero-p">スタンプを全部集めて<br />特別景品をゲットしよう</div>
        <div className="hero-tag">🎁 景品あり</div>
      </div>
      <div className="home-grid">
        <div className="hq-card clickable" style={{ background: '#00D4D4' }} onClick={() => navigate('bingo')}>
          <svg className="hq-icon" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          <div className="hq-label">ビンゴカード</div>
        </div>
        <div className="hq-card clickable" style={{ background: '#FF2D8B' }} onClick={() => navigate('qr')}>
          <svg className="hq-icon" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01" />
          </svg>
          <div className="hq-label" style={{ color: '#FFF' }}>QR読み込み</div>
        </div>
        <div className="hq-card clickable" style={{ background: '#FFD900' }} onClick={() => navigate('prize')}>
          <svg className="hq-icon" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
            <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
          </svg>
          <div className="hq-label">景品確認</div>
        </div>
        <div className="hq-card clickable" style={{ background: '#00C060' }} onClick={() => navigate('manual')}>
          <svg className="hq-icon" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="hq-label" style={{ color: '#FFF' }}>遊び方</div>
        </div>
      </div>
      <div style={{ flex: 1 }}></div>
      <div className="big-btn clickable" onClick={startRally}>スタート →</div>
      <div className="stripe"></div>
    </div>
  );
};

export default Home;