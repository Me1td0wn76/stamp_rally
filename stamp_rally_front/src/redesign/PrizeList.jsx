import { useState } from 'react';
import { Title } from './parts.jsx';
import PRIZES from './prizeData.js';
import './prizeList.css';

// 景品一覧。用意している景品を写真・名前・紹介文で見せるだけの画面（ビンゴの達成状況は関係なく見られる）
// 景品画面の「景品一覧を見る」から開き、「景品画面に戻る」で景品画面に戻る（戻ると景品画面が達成状況を取り直す）
// 景品は prizeData.js に書く

// 景品1つ分のカード。画像が読めないときは、こわれた画像を出さずに名前と紹介文だけにする
const PrizeCard = ({ prize }) => {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <li className="rd-box">
      {prize.image && !imageFailed && (
        <img
          className="rd-pl-img"
          src={prize.image}
          alt={prize.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}
      <h2>{prize.name}</h2>
      {prize.description && <p>{prize.description}</p>}
    </li>
  );
};

const PrizeList = ({ navigate }) => {
  return (
    <>
      <Title name="景品一覧" back={{ label: '景品画面に戻る', onClick: () => navigate('prize') }} />
      <section className="rd-box rd-box--lead">
        <p>今回の学園祭で用意する景品をご紹介します。</p>
      </section>
      {PRIZES.length > 0 ? (
        <ul className="rd-pl">
          {PRIZES.map((p) => <PrizeCard key={p.id} prize={p} />)}
        </ul>
      ) : (
        <section className="rd-box">
          <h2>景品は準備中です</h2>
          <p>一覧の公開をお楽しみに！</p>
        </section>
      )}
    </>
  );
};

export default PrizeList;
