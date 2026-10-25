// 景品一覧に出す景品。配列の順番がそのまま表示の順番になる
// id: 重複しない識別子 / name: 景品名 / description: 短い紹介文（任意） / image: 画像のパス（任意）
// 画像は元の写真を prize_originals/ に置いて npm run compress-images を実行し、表示されたパス('/prizes/○○.webp')を image に書く
// （縮小と Exif の削除はこのコマンドでしか行われない。元の写真を public/prizes/ に直接置かない）
// 参加者に公開してよい内容だけを書く（決まっていない景品や、確認用の仮データは入れない）
// 例: { id: 'umaibo', name: 'うまい棒', image: '/prizes/umaibo.webp' },
//     { id: 'complete', name: 'お菓子セット', description: 'コンプリート報酬', image: '/prizes/complete.webp' },
const PRIZES = [];

export default PRIZES;
