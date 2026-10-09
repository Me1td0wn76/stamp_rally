import { Pumpkin, Title } from './parts.jsx';

// 開発者紹介（隠し画面）。説明画面で黒猫をつかまえて上に引っぱると出てくる。
// 名前と担当は git の記録から下書きしたもの。表示名・担当の書き方はチームで確認して直す
// name は GitHub のアカウント名。プロフィール画像とページへのリンクはここから作る（画像は GitHub から直接読み込む）

const DEVS = [
  { name: 'Me1td0wn76', parts: ['プロジェクトの立ち上げ', 'バックエンドのひな形と MVC 化', 'README'] },
  { name: 'Tongari-Boy', parts: ['スポットとビンゴの仕組み', '種類ごとのマスとランダムなスタンプ', 'QR コードでのスタンプ取得'] },
  { name: 'syun17', parts: ['ユーザー ID の発行と Cookie 管理', 'セキュリティまわり', 'NFC・QR の読み取りの改善', 'ルーティング'] },
  { name: 'shouras', parts: ['画面のコンポーネント', '共通のスタイル'] },
  { name: 'Orica256', parts: ['タブバーと画面遷移', 'モック画面'] },
  { name: 'niseeri-to', parts: ['画面構成と文言の調整'] },
  { name: 'Sabigon-MA', parts: ['画面デザインの作り直し（切り絵のかぼちゃ）'] },
];

// GitHub のマーク
const GitHubMark = () => (
  <svg className="rd-cr-gh" viewBox="0 0 16 16" aria-hidden="true">
    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const Credits = ({ navigate }) => {
  return (
    <>
      <Title name="つくった人たち" back={{ label: '説明', onClick: () => navigate('manual') }} />
      <section className="rd-box rd-box--lead rd-cr-lead">
        <span className="rd-cr-stamp" aria-hidden="true"><Pumpkin /></span>
        <p>黒猫をつかまえたあなたにだけ、このスタンプラリーをつくったメンバーを紹介します。</p>
      </section>
      <ul className="rd-cr">
        {DEVS.map((d) => (
          <li key={d.name} className="rd-box">
            <div className="rd-cr-head">
              <img
                className="rd-cr-avatar"
                src={`https://github.com/${d.name}.png?size=120`}
                alt=""
                width="56"
                height="56"
                loading="lazy"
                // 画像が読めないとき（オフラインなど）は、画像を隠す
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <h2>{d.name}</h2>
            </div>
            <ul className="rd-cr-parts">
              {d.parts.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <a className="rd-btn rd-btn--line rd-cr-link" href={`https://github.com/${d.name}`} target="_blank" rel="noopener noreferrer">
              <GitHubMark />GitHub を見る
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className="rd-btn" onClick={() => navigate('manual')}>← 説明に戻る</button>
    </>
  );
};

export default Credits;
