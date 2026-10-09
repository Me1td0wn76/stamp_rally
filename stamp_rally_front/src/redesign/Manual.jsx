import { Icon, Pumpkin, Title } from './parts.jsx';

// 説明。遊び方のスライドより細かく、はじめかたから景品の受け取りまでを順に書く。
// ビンゴ画面の「説明」とかぼちゃのメニューから開ける
const Manual = ({ navigate, openGuide }) => {
  return (
    <>
      <Title name="説明" back={{ label: 'ビンゴ', onClick: () => navigate('bingo') }} />

      <section className="rd-box rd-box--lead">
        <p>会場のスポットでスタンプを集めて、3×3 のビンゴカードを埋めていくスタンプラリーです。1列そろうと景品と交換できます。</p>
      </section>

      <ol className="rd-man">
        <li className="rd-box">
          <h2>はじめかた</h2>
          <ul>
            <li>遊び方の最後の「はじめる」を押すと、ビンゴカードがもらえます。</li>
            <li>カードは、今開いているブラウザに記録されます。別のブラウザやシークレットモードで開くと、別のカードになります。</li>
          </ul>
        </li>

        <li className="rd-box">
          <h2>スタンプのもらい方</h2>
          <dl className="rd-man-ways">
            <dt><Icon name="nfc" />NFC タグ（Android）</dt>
            <dd>NFC の画面で「NFC読込」を押し、スポットの NFC タグにスマホをかざします。</dd>
            <dt><Icon name="nfc" />NFC タグ（iPhone など）</dt>
            <dd>NFC タグにスマホを近づけると通知が出ます。通知をタップするとスタンプが付きます。</dd>
            <dt><Icon name="qr" />QR コード</dt>
            <dd>スマホのカメラアプリで会場の QR コードを読み取り、出てきた URL を開くとスタンプが付きます。</dd>
          </dl>
          <p className="rd-man-note">同じスポットのスタンプは1回だけもらえます。</p>
        </li>

        <li className="rd-box">
          <h2>マスの埋まり方</h2>
          <div className="rd-man-row">
            <div className="rd-fig-chips" aria-hidden="true"><span>飲食</span><span>企画</span><span>Codeflow</span></div>
            <ul>
              <li>マスは「飲食」「企画」「Codeflow」の3種類です。</li>
              <li>スタンプをもらったスポットと同じ種類の、空いているマスが1つ埋まります。</li>
              <li>マスの並びは人によってちがいます。</li>
            </ul>
          </div>
        </li>

        <li className="rd-box">
          <h2>ビンゴ</h2>
          <div className="rd-man-row">
            <div className="rd-fig-grid" aria-hidden="true">
              <span className="is-on is-line"><Pumpkin /></span><span className="is-on is-line"><Pumpkin /></span><span className="is-on is-line"><Pumpkin /></span>
              <span></span><span className="is-on"><Pumpkin /></span><span></span>
              <span></span><span></span><span></span>
            </div>
            <ul>
              <li>縦・横・ななめのどれか1列がそろうとビンゴです。</li>
              <li>そろった列のマスは金色になります。</li>
              <li>9マスすべて埋まるとコンプリートです。</li>
            </ul>
          </div>
        </li>

        <li className="rd-box">
          <h2>景品の受け取り</h2>
          <ul>
            <li>ビンゴになったら「景品」の画面を開きます。</li>
            <li>402教室に行き、スタッフにその画面を見せてください。</li>
          </ul>
        </li>

        <li className="rd-box">
          <h2>画面の移動</h2>
          <ul>
            <li>画面のすみにあるかぼちゃを押すと口が開いて、ビンゴ・NFC・景品・説明へ移動できます。</li>
            <li>かぼちゃを長押しして動かすと、好きな角に置けます。</li>
          </ul>
        </li>

        <li className="rd-box">
          <h2>こんなときは</h2>
          <dl className="rd-man-faq">
            <dt>「このスポットはすでにスタンプ済みです」</dt>
            <dd>そのスポットのスタンプはもうもらっています。別のスポットをまわってみてください。</dd>
            <dt>「登録されていないタグ・QRコードです」</dt>
            <dd>スタンプラリーのタグ・QR コードではありません。近くのスタッフに声をかけてください。</dd>
            <dt>カードが消えて「遊び方を見てはじめる」が出る</dt>
            <dd>はじめたときと別のブラウザで開いていないか確かめてください。</dd>
          </dl>
        </li>
      </ol>

      <button type="button" className="rd-btn rd-btn--pri rd-btn--big" onClick={openGuide}><Icon name="manual" />スライドで見る</button>
      <button type="button" className="rd-btn" onClick={() => navigate('bingo')}>← ビンゴに戻る</button>
    </>
  );
};

export default Manual;
