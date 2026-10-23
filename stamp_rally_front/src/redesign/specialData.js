export const ENTRY_SCRIPT = [
  { kind: 'cmd', text: 'whoami' },
  { kind: 'out', text: 'guest #{no}（スタンプ {stamps} / 9）' },
  { kind: 'cmd', text: 'stamp --read' },
  { kind: 'out', text: 'CodeFlow のスタンプを読み取りました' },
  { kind: 'out', text: '押したスタッフ …… {staff}' },
  { kind: 'warn', text: '!! シークレットキーが含まれています' },
  { kind: 'cmd', text: 'sudo unlock special-room' },
  { kind: 'pw', text: '[sudo] guest のパスワード: ', dots: 7 },
  { kind: 'err', text: 'パスワードがちがいます。ヒント：今日の合言葉' },
  { kind: 'pw', text: '[sudo] guest のパスワード: ', dots: 14 },
  { kind: 'ok', text: '認証しました（trick-or-stamp）' },
  { kind: 'cmd', text: 'git clone codeflow/special-room' },
  { kind: 'out', text: "Cloning into 'special-room'..." },
  { kind: 'out', text: 'Receiving objects: 100% ({commits}/{commits}), done.' },
  { kind: 'cmd', text: './meltdown.sh --force' },
  { kind: 'bar', text: '炉心温度  36℃', fill: 2 },
  { kind: 'bar', text: '炉心温度 180℃', fill: 5 },
  { kind: 'bar', text: '炉心温度 666℃', fill: 10, hot: true },
  { kind: 'warn', text: 'WARNING: ふつうの画面がとけています' },
  { kind: 'warn', text: 'WARNING: とめられません' },
  { kind: 'cmd', text: 'cd special-room && open .' },
];

export const TIMING = { start: 400, char: 24, dot: 40, line: 105, afterCmd: 150, beforeCmd: 220, bar: 240, melt: 380, meltLen: 1400, door: 600 };
export function timeline(vars) {
  let t = TIMING.start;
  const lines = ENTRY_SCRIPT.map((l, i) => {
    const text = l.text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
    let at = t, dur = 0;
    if (l.kind === 'cmd') {
      if (i > 0) at = t + TIMING.beforeCmd;
      dur = text.length * TIMING.char;
      t = at + dur + TIMING.afterCmd;
    } else if (l.kind === 'pw') {
      dur = l.dots * TIMING.dot;
      t = at + dur + TIMING.line * 2;
    } else if (l.kind === 'bar') {
      dur = TIMING.bar;
      t = at + dur + TIMING.line;
    } else {
      t = at + TIMING.line;
    }
    return { ...l, text, at, dur };
  });
  const melt = t + TIMING.melt;             
  const door = melt + TIMING.meltLen;       
  return { lines, melt, door, end: door + TIMING.door + 900 };
}
export const MEMBERS = [
  { name: 'Me1td0wn76', parts: ['プロジェクトの立ち上げ', 'バックエンドのひな形と MVC 化', 'README'], commits: 72, first: '2026-05-15',
    word: '特別室へようこそ！楽しんでいってね！！', lang: 'Java / TypeScript / Python', stamp: 'Me1td0wn76_stamp.png' },
  { name: 'Tongari-Boy', parts: ['スポットとビンゴの仕組み', '種類ごとのマスとランダムなスタンプ', 'QR コードでのスタンプ取得'], commits: 15, first: '2026-05-16', word: '', lang: '', stamp: 'UCI_stamp.png' },
  { name: 'syun17', parts: ['ユーザー ID の発行と Cookie 管理', 'セキュリティまわり', 'NFC・QR の読み取りの改善', 'ルーティング'], commits: 12, first: '2026-05-17', word: '', lang: '' },
  { name: 'shouras', parts: ['画面のコンポーネント', '共通のスタイル'], commits: 8, first: '2026-05-22', word: '', lang: '' },
  { name: 'niseeri-to', parts: ['画面構成と文言の調整'], commits: 3, first: '2026-10-09', word: '', lang: '' },
  { name: 'Sabigon-MA', parts: ['画面デザインの作り直し（切り絵のかぼちゃ）'], commits: 2, first: '2026-10-09', word: '', lang: '' },
  { name: 'Orica256', parts: ['タブバーと画面遷移', 'モック画面'], commits: 2, first: '2026-05-22', word: '', lang: '' },
];
export const STATS = [
  { label: 'コミット', value: '152', unit: '回' },
  { label: 'プルリクエスト', value: '29', unit: '本' },
  { label: 'コード', value: '9,446', unit: '行' },
  { label: 'メンバー', value: '7', unit: '人' },
];
export const NIGHT_OWL = { time: '1:52', date: '10/9', who: 'Sabigon-MA', what: 'デザイン作り直し用の画面を追加' };

export const HISTORY = [
  { date: '5/15', text: '最初のコミット（Vite でフロントエンドを作成）' },
  { date: '5/16', text: 'ビンゴ付きスタンプラリーのバックエンド' },
  { date: '5/22', text: 'QR コードを読み取る画面' },
  { date: '6/20', text: 'QR コードでスタンプが取れるように' },
  { date: '10/9', text: '切り絵のかぼちゃに作り直し。Render で公開、Cookie で1人ずつのカードに。CodeFlow はスタッフごとの印に' },
  { date: '10/10', text: '管理画面。QR と NFC の読み取りを1つの画面に' },
  { date: '10/14', text: 'スタンプ図鑑' },
  { date: '10/31', text: '学園祭の本番', now: true },
];
export const GALLERY = [
  { src: '/special/boa-first.jpg', title: '最初の画面', note: '5月。黒いふちのポップな画面' },
  { src: '/special/boa-note.jpg', title: 'キャンパスノート案', note: '方眼ノートと朱いスタンプ' },
  { src: '/special/boa-now.jpg', title: '切り絵のかぼちゃ', note: 'いまの画面', now: true },
];
export const ROOM_ITEMS = [
  { key: 'members', label: 'メンバー', icon: 'poster', ready: true },
  { key: 'making', label: 'メイキング', icon: 'album', ready: true },
  { key: 'term', label: 'ターミナル', icon: 'monitor', ready: true },
  { key: 'photo', label: '記念写真', icon: 'camera', ready: true },
  { key: 'live', label: 'いまの会場', icon: 'window', ready: true },
  { key: 'how', label: 'しくみ', icon: 'board', ready: true },
  { key: 'safe', label: '金庫', icon: 'safe', ready: true },
];
export const FORTUNES = [
  '動いているコードには、さわるな。',
  'バグは、いちばん自信のある行にいる。',
  'コミットは小さく、こまめに。',
  '「あとで直す」の「あと」は来ない。',
  '本番は、いつも金曜日にやってくる。',
  'エラー文は、ちゃんと読むと答えが書いてある。',
];
export const HELP = [
  ['help', 'この一覧'],
  ['whoami', 'あなたはだれ？'],
  ['ls', '特別室にあるもの'],
  ['cat members.txt', 'つくった人たち'],
  ['git log', 'さいきんのコミット'],
  ['fortune', '開発のことわざ'],
  ['pumpkinsay ことば', 'かぼちゃがしゃべる'],
  ['trick', 'いたずら'],
  ['treat', 'おかし'],
  ['clear', '画面をきれいに'],
  ['exit', '特別室に戻る'],
];


export const TREATS = [
  'キャンディをもらいました（ハッカ味）',
  'チョコレートをもらいました',
  'かぼちゃのクッキーをもらいました',
  'キャラメルポップコーンをもらいました',
  'グミをもらいました（ぶどう味）',
];
export const SECRET_NOTE = [
  'ここまで来てくれて、ありがとう。',
  'この部屋は、Me1td0wnが秘密裏に作った、部屋だよ～',
  'ほかにもいろいろな隠し要素があるから、探してみてね。',
  '— Me1td0wn76より',
];
export const CAT_LINES = [
  'にゃー',
  'ここは Me1td0wn の、ひみつの部屋だにゃ',
  '金庫の暗証番号は、開けるたびに変わるにゃ',
  'チケットの番号は入った順に 0001, 0002, 0003……とつくにゃ',
  'ターミナルで ls と打つと、何か見つかるかもにゃ',
  'かぼちゃのメニューを続けて10回押すと……なんでもないにゃ',
  'ここまで来られた人は、ほんのひとにぎりだにゃ',
  '説明のところでニャーを持ち上げると...にゃー',
];

export const GIT_LOG = [
  'fe7996b Goのバージョンを1.26.10に更新',
  '2ab94cf うひょまんスタンプ追加',
  'dd7a08e ダーツベイダー2のスタンプ画像を更新',
  'f5d41be スタンプ図鑑コンポーネントを新規作成',
  '44e18bb first commit create frontend with vite',
];

export const HOW_STEPS = [
  { title: 'QR コード・NFC タグ', text: '中には URL が入っています。?spot= のあとが、スポット（とスタッフ）ごとのトークンです。当てずっぽうで作れないよう、16文字以上のランダムな文字列にしています。', code: 'https://…/?spot=••••••••' },
  { title: 'ブラウザ → サーバー', text: 'トークンを POST で送ります。だれのスタンプかは、Cookie のユーザーIDでわかります。この Cookie は HttpOnly なので、JavaScript からは読めません。', code: 'POST /api/stamps/qr\n{ "qr_token": "••••••••" }' },
  { title: 'サーバー（Go）', text: 'トークンから、どのスポット・どのスタッフかを探します。ロック（sync.Mutex）をかけてから、まだ取っていないかを確かめ、埋めるマスを暗号用の乱数（crypto/rand）で選びます。', code: 'AcquireStamp(userID, src)' },
  { title: 'メモリに記録', text: 'データベースは使わず、サーバーのメモリ（Go の map）に置いています。サーバーを再起動すると、すべて消えます。', code: 'Stamps[userID] = append(Stamps[userID], stamp)' },
  { title: 'サーバー → ブラウザ', text: '201 Created と、埋まったマスの番号を返します。特別室のカギのスタンプのときだけ、secret が付いて、この部屋が開きます。', code: '201 Created\n{ "spot_id": 1, "cell_index": 4, "secret": { … } }' },
  { title: '画面（React）', text: 'ビンゴの状況を取り直して、マスにスタンプを押します。マスの並びは保存せず、ユーザーIDから毎回同じ計算で決めています。', code: 'GET /api/bingo' },
];

export const HOW_APIS = [
  { path: '/api/bingo', label: 'ビンゴ', note: 'あなたのビンゴカード' },
  { path: '/api/zukan', label: '図鑑', note: '全スポットと、取ったかどうか' },
  { path: '/api/stamps', label: 'スタンプ', note: '取ったスタンプの記録' },
  { path: '/api/special-room', label: '入室の記録', note: 'あなたの入室番号など' },
  { path: '/api/special-room/live', label: 'いまの会場', note: '会場全体の数字' },
  { path: '/api/special-room/how', label: 'サーバーの中', note: 'このページの「サーバーの中」' },
];
