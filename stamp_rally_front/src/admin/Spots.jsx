import { BarList } from './charts.jsx';
import { downloadCsv } from './download.js';
import { TYPE_LABEL, fileStamp, fmtNum, withRanks } from './format.js';

// スポット:スポットごとのスタンプ数(GET /api/admin/summary の spots)
// どこが人気か・まだ来られていないスポットはどこかを見る
export default function Spots({ summary }) {
  const { spots, players } = summary;
  const total = spots.reduce((n, s) => n + s.count, 0);
  const ranking = withRanks(
    [...spots]
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        key: s.spot_id,
        name: s.name,
        sub: [s.description, TYPE_LABEL[s.type] ?? s.type, players > 0 ? `押した人の ${Math.round((s.count / players) * 100)}% が来た` : '']
          .filter(Boolean)
          .join('・'),
        value: s.count,
      })),
  );
  const notVisited = spots.filter((s) => s.count === 0).length;

  const saveCsv = () => {
    downloadCsv(`spots-${fileStamp()}.csv`, [
      ['スポットID', '名前', '場所', '種類', 'スタンプ数'],
      ...spots.map((s) => [s.spot_id, s.name, s.description, TYPE_LABEL[s.type] ?? s.type, s.count]),
    ]);
  };

  return (
    <section className="rd-box">
      <h2>スポットごとのスタンプ数</h2>
      <p>
        合計 {fmtNum(total)} 個・{spots.length} スポット
        {notVisited > 0 && <>(まだ 0 個のスポットが {notVisited} か所)</>}
      </p>
      <BarList rows={ranking} unit="個" />
      <button type="button" className="rd-btn ad-btn-small ad-noprint" onClick={saveCsv}>CSV で保存</button>
    </section>
  );
}
