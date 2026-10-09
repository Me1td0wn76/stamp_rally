import { useState, useEffect } from 'react';
import { Icon, Title } from './parts.jsx';
import Loader from './Loader.jsx';
import LoadError from './LoadError.jsx';

// 景品。ビンゴが1列でもそろっていれば「ビンゴ済み」、そろっていなければ「まだ」の画面を出す
// そろったかどうかはビンゴ画面と同じ /api/bingo の bingo_count で判定する
const Prize = ({ navigate }) => {
  // null: 確認中 / false: まだ（未スタートも含む） / true: ビンゴ済み
  const [achieved, setAchieved] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/bingo');
        // 未スタート(401)はまだビンゴしていない扱い
        if (res.status === 401) {
          setAchieved(false);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '不明なエラー');
        setAchieved(data.bingo_count > 0);
      } catch (err) {
        setMessage('ビンゴ状況取得失敗: ' + err.message);
      }
    })();
  }, []);

  if (achieved === null) {
    return (
      <>
        <Title name="景品" back={{ label: 'ビンゴ', onClick: () => navigate('bingo') }} />
        {message ? <LoadError message={message} /> : <Loader />}
      </>
    );
  }

  if (!achieved) {
    return (
      <>
        <Title name="景品" back={{ label: 'ビンゴ', onClick: () => navigate('bingo') }} />
        <section className="rd-ticket">
          <Icon name="prize" />
          <h2>まだビンゴしていません</h2>
          <p>縦・横・ななめのどれか1列がそろうと景品と交換できます</p>
        </section>
        <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={() => navigate('bingo')}>ビンゴカードを見る</button>
      </>
    );
  }

  return (
    <>
      <Title name="景品" back={{ label: 'ビンゴ', onClick: () => navigate('bingo') }} />
      <section className="rd-ticket rd-ticket--yes">
        <Icon name="prize" />
        <h2>景品交換場所</h2>
        <p>ビンゴ達成おめでとう！</p>
      </section>
      <section className="rd-box">
        <dl className="rd-dl">
          <dt>受取場所</dt><dd>402教室に来てください</dd>
        </dl>
        <p>スタッフにこの画面を見せてね</p>
      </section>
      <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>← 戻る</button>
    </>
  );
};

export default Prize;
