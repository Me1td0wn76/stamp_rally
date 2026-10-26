// 景品一覧に出す景品。配列の順番がそのまま表示の順番になる
// id: 重複しない識別子 / name: 景品名 / description: 短い紹介文（任意） / image: 画像のパス（任意）
// 画像は public/prizes/ に置き、そのパス('/prizes/○○.webp')を image に書く（public は書かない）
// （置いたファイルがそのまま公開される。撮影場所などの Exif を消し、長い辺 600px・1枚 100KB 以下を目安に縮めてから置く）
// 景品が決まるまでは、画面を確かめるための仮データを入れておく。決まったら、参加者に公開してよい内容だけに差し替える
// 例: { id: 'umaibo', name: 'うまい棒', image: '/prizes/umaibo.webp' },
//     { id: 'complete', name: 'お菓子セット', description: 'コンプリート報酬', image: '/prizes/complete.webp' },
// 【確認用の仮データ。本番の景品が決まったら差し替える】
const PRIZES = [
  { id: 'sample1', name: '仮の景品A', description: 'コンプリート報酬' },
  { id: 'sample2', name: '仮の景品B', description: 'ビンゴ1列の景品' },
  { id: 'sample3', name: '仮の景品C' },
];

export default PRIZES;
