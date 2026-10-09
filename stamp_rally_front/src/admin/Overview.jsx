import { ColumnChart, Meter, Stat, TableView } from './charts.jsx';
import { fmtDateTime, fmtDuration, fmtHour, fmtNum } from './format.js';

// ユーザー数が上限(MAX_USERS)のこの割合を超えたら知らせる
const USERS_WARN_RATIO = 0.8;

// 概要:参加者数・ビンゴ達成数・ユーザー数の上限・時間帯ごとのスタンプ数・埋まったマスの数ごとの人数
export default function Overview({ summary }) {
  const s = summary;
  const uptime = new Date(s.now) - new Date(s.started_at);
  const usersRatio = s.max_users > 0 ? s.users / s.max_users : 0;
  const percentOfPlayers = (n) => (s.players > 0 ? `押した人の${Math.round((n / s.players) * 100)}%` : '');

  const hourly = s.hourly.map((h) => ({ key: h.hour, x: fmtHour(h.hour), value: h.count, tip: `${fmtDateTime(h.hour)}〜` }));
  const filled = s.filled_hist.map((n, i) => ({ key: i, x: i, value: n, tip: i === 0 ? 'はじめただけ(0マス)' : `${i}マス` }));

  return (
    <>
      <section className="rd-box ad-since">
        <p>
          <b>{fmtDateTime(s.started_at)}</b> からの記録です(サーバーが起動してから {fmtDuration(uptime)})
        </p>
        <p className="ad-small">サーバーを再起動(デプロイ・環境変数の変更)すると、それまでの記録は消えます</p>
      </section>

      <div className="ad-tiles">
        <Stat label="はじめた人" value={s.users} unit="人" sub={`スタンプ1つ以上:${fmtNum(s.players)}人`} />
        <Stat label="スタンプ総数" value={s.stamps} unit="個" sub={s.players > 0 ? `1人あたり ${(s.stamps / s.players).toFixed(1)}個` : ''} />
        <Stat label="ビンゴ達成" value={s.bingo_players} unit="人" sub={percentOfPlayers(s.bingo_players)} />
        <Stat label="全マス制覇" value={s.complete_players} unit="人" sub={percentOfPlayers(s.complete_players)} />
      </div>

      <div className="ad-cols2">
        <section className="rd-box">
          <h2>時間帯ごとのスタンプ数</h2>
          {hourly.length > 0 ? (
            <>
              <ColumnChart items={hourly} unit="個" xUnit="(時)" label="時間帯ごとのスタンプ数" />
              <TableView head={['時間帯', 'スタンプ数']} rows={s.hourly.map((h) => [`${fmtDateTime(h.hour)}〜`, fmtNum(h.count)])} />
            </>
          ) : (
            <p>まだスタンプが押されていません</p>
          )}
        </section>

        <section className="rd-box">
          <h2>埋まったマスの数ごとの人数</h2>
          {s.users > 0 ? (
            <>
              <ColumnChart items={filled} unit="人" xUnit="(マス)" label="埋まったマスの数ごとの人数" />
              <TableView head={['埋まったマス', '人数']} rows={s.filled_hist.map((n, i) => [`${i}マス`, fmtNum(n)])} />
            </>
          ) : (
            <p>まだはじめた人がいません</p>
          )}
        </section>
      </div>

      <section className="rd-box">
        <h2>ユーザー数の上限</h2>
        <Meter value={s.users} max={s.max_users} label="ユーザー数の上限に対する発行済みの数" />
        <p>
          {fmtNum(s.users)} / {fmtNum(s.max_users)} 人({Math.round(usersRatio * 100)}%)
        </p>
        {usersRatio >= USERS_WARN_RATIO && (
          <p className="ad-warn" role="status">⚠ 上限に近づいています。上限に達すると新しくはじめられなくなります(環境変数 MAX_USERS で変えられます)</p>
        )}
      </section>
    </>
  );
}
