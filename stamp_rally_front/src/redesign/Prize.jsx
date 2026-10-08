import { Icon, Title } from './parts.jsx';

// 景品。文言は今の画面（components/Prize.jsx）と同じ
const Prize = ({ navigate }) => {
  return (
    <>
      <Title name="景品" back={{ label: '戻る', onClick: () => navigate('bingo') }} />
      <section className="rd-ticket">
        <Icon name="prize" />
        <h2>景品交換場所</h2>
        <p>ビンゴ達成おめでとう！</p>
      </section>
      <section className="rd-box">
        <dl className="rd-dl">
          <dt>受取場所</dt><dd>○○教室に来てください</dd>
        </dl>
        <p>スタッフにこの画面を見せてね</p>
      </section>
      <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>← 戻る</button>
    </>
  );
};

export default Prize;
