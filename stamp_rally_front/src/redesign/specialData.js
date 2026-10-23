// 特別室で使うデータ（文言・メンバー・数字）。画面の部品はここを読むだけにして、直すときはこのファイルだけ触ればよいようにする。
// 数字（コミット数など）は 2026-10-24 時点のリポジトリから数えたもの。本番前に、リポジトリの直下で数え直す。
//   コミット：git rev-list --count HEAD（RedesignApp.jsx の SPECIAL_COMMITS も同じ数にする）
//   プルリクエスト：git log --oneline --merges | grep -c 'Merge pull request'
//   人ごとのコミット：git shortlog -sne --no-merges HEAD（同じ人の別名・別のメールはまとめる。Claude の名前のコミットは数えない）
//   コード行数：git ls-files | grep -E '\.(go|jsx|js|css)$' | xargs wc -l | tail -1

// ---------------------------------------------------------------- 入室の演出で自動で打たれるコマンド
// kind: cmd（打たれるコマンド）/ out（ふつうの出力）/ warn（かぼちゃ色）/ err（まちがい）/ ok（成功）/ pw（パスワードの●）/ bar（温度のメーター）
// {no} は入室番号（4けた）、{stamps} はスタンプの数、{staff} は押したスタッフ、{commits} はコミット数に置きかわる
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

// 時間（ms）。1文字ずつ打つ速さ、出力の行の間、コマンドの前後の間
export const TIMING = { start: 400, char: 24, dot: 40, line: 105, afterCmd: 150, beforeCmd: 220, bar: 240, melt: 380, meltLen: 1400, door: 600 };

// 行ごとに「いつ出るか」を計算する。返す配列の各行に at（出はじめ）と dur（打ち終わるまで）が付く
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
  const melt = t + TIMING.melt;             // 画面がとけはじめる
  const door = melt + TIMING.meltLen;       // とけ終わって、扉と入室証が出る
  return { lines, melt, door, end: door + TIMING.door + 900 };
}

// ---------------------------------------------------------------- メンバー
// 担当（parts）は Credits.jsx と同じもの。commits と first はリポジトリから数えた数（同じ人の別名はまとめた）
// word（ひとこと）と lang（好きな言語）は本人に書いてもらう。空のあいだは「準備中」と出す
// stamp は CodeFlow のスタッフの印（public/stamps/ のファイル名。staff.go と同じ）
export const MEMBERS = [
  { name: 'Me1td0wn76', parts: ['プロジェクトの立ち上げ', 'バックエンドのひな形と MVC 化', 'README'], commits: 64, first: '2026-05-15',
    word: '人生、だいたいJavaでなんとかなる。', lang: 'Java / TypeScript / Python', stamp: 'Me1td0wn76_stamp.png' },
  { name: 'Tongari-Boy', parts: ['スポットとビンゴの仕組み', '種類ごとのマスとランダムなスタンプ', 'QR コードでのスタンプ取得'], commits: 15, first: '2026-05-16', word: '', lang: '', stamp: 'UCI_stamp.png' },
  { name: 'syun17', parts: ['ユーザー ID の発行と Cookie 管理', 'セキュリティまわり', 'NFC・QR の読み取りの改善', 'ルーティング'], commits: 12, first: '2026-05-17', word: '', lang: '' },
  { name: 'shouras', parts: ['画面のコンポーネント', '共通のスタイル'], commits: 8, first: '2026-05-22', word: '', lang: '' },
  { name: 'niseeri-to', parts: ['画面構成と文言の調整'], commits: 3, first: '2026-10-09', word: '', lang: '' },
  { name: 'Sabigon-MA', parts: ['画面デザインの作り直し（切り絵のかぼちゃ）'], commits: 2, first: '2026-10-09', word: '', lang: '' },
  { name: 'Orica256', parts: ['タブバーと画面遷移', 'モック画面'], commits: 2, first: '2026-05-22', word: '', lang: '' },
];

// ---------------------------------------------------------------- メイキング
export const STATS = [
  { label: 'コミット', value: '144', unit: '回' },
  { label: 'プルリクエスト', value: '29', unit: '本' },
  { label: 'コード', value: '8,545', unit: '行' },
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

// ボツ案（public/special/ の画像）
export const GALLERY = [
  { src: '/special/boa-first.jpg', title: '最初の画面', note: '5月。黒いふちのポップな画面' },
  { src: '/special/boa-note.jpg', title: 'キャンパスノート案', note: '方眼ノートと朱いスタンプ' },
  { src: '/special/boa-now.jpg', title: '切り絵のかぼちゃ', note: 'いまの画面', now: true },
];

// ---------------------------------------------------------------- 部屋に置いてあるもの
// view は開く中身。ready が false のものは「準備中」の札を出して押せなくする
export const ROOM_ITEMS = [
  { key: 'members', label: 'メンバー', icon: 'poster', ready: true },
  { key: 'making', label: 'メイキング', icon: 'album', ready: true },
  { key: 'term', label: 'ターミナル', icon: 'monitor', ready: true },
  { key: 'photo', label: '記念写真', icon: 'camera', ready: true },
  { key: 'live', label: 'いまの会場', icon: 'window', ready: false },
  { key: 'how', label: 'しくみ', icon: 'board', ready: false },
  { key: 'safe', label: '金庫', icon: 'safe', ready: true },
];

// ---------------------------------------------------------------- 自由に打てるターミナル
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
  ['clear', '画面をきれいに'],
  ['exit', '特別室に戻る'],
];

export const GIT_LOG = [
  'fe7996b Goのバージョンを1.26.10に更新',
  '2ab94cf うひょまんスタンプ追加',
  'dd7a08e ダーツベイダー2のスタンプ画像を更新',
  'f5d41be スタンプ図鑑コンポーネントを新規作成',
  '44e18bb first commit create frontend with vite',
];
